import { answerText } from '@/lib/answerText';
import { byReadingOrder } from '@/lib/geometry';
import { slugify } from '@/lib/slug';
import type { Answers, FieldElement, FormDoc } from '@/types/doc';

const BOM = String.fromCharCode(0xfeff);

export interface CsvResponse {
  createdAt: string;
  answers: Answers;
}

/**
 * One cell, always quoted, quotes doubled. A cell that starts with = + - @ tab or return would be
 * run as a formula by a spreadsheet, so it gets a leading quote. (A phone number starting with +
 * gains that quote too, which is a known trade-off.)
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function fieldColumns(doc: Pick<FormDoc, 'elements'>): { field: FieldElement; header: string }[] {
  const fields = doc.elements
    .filter((el): el is FieldElement => el.type === 'field')
    .sort(byReadingOrder);
  const seen = new Map<string, number>();
  return fields.map((field) => {
    const base = field.label || field.name || 'Field';
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return { field, header: count === 1 ? base : `${base} (${count})` };
  });
}

/** The whole file: a header, then one row per response (newest first, as given). */
export function buildCsv(
  doc: Pick<FormDoc, 'elements'>,
  responses: readonly CsvResponse[],
): string {
  const columns = fieldColumns(doc);
  const known = new Set(columns.map((c) => c.field.id));
  // Answers whose field was deleted after publishing still get a column, so nothing is hidden.
  const removed: string[] = [];
  for (const response of responses) {
    for (const id of Object.keys(response.answers)) {
      if (!known.has(id) && !removed.includes(id)) removed.push(id);
    }
  }
  const header = [
    'Submitted at',
    ...columns.map((c) => c.header),
    ...removed.map((_, i) => (i === 0 ? '(removed field)' : `(removed field ${i + 1})`)),
  ];
  const rows = responses.map((response) => [
    response.createdAt,
    ...columns.map((c) => answerText(c.field, response.answers[c.field.id])),
    ...removed.map((id) => {
      const value = response.answers[id];
      return Array.isArray(value) ? value.join('; ') : (value ?? '');
    }),
  ]);
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(','));
  // The BOM makes Excel read the file as UTF-8, so accents survive.
  const eol = String.fromCharCode(13, 10);
  return BOM + lines.join(eol) + eol;
}

export function csvFileName(title: string, date: Date = new Date()): string {
  return `${slugify(title, 'form')}-responses-${date.toISOString().slice(0, 10)}.csv`;
}
