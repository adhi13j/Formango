import { formatDate } from '@/lib/answers';
import { parseRows } from '@/lib/groups';
import type { FieldElement } from '@/types/doc';

type Value = string | string[] | undefined;

/** Entries of a repeating group as readable lines: "Name: Asha; Relationship: Mother". */
export function groupEntries(field: FieldElement, value: Value): string[] {
  return parseRows(typeof value === 'string' ? value : undefined).map((row) =>
    field.columns
      .filter((column) => (row[column.id] ?? '') !== '')
      .map((column) => `${column.label}: ${row[column.id] ?? ''}`)
      .join('; '),
  );
}

/** An answer as plain text, for the response panel and the CSV. Nothing is HTML. */
export function answerText(field: FieldElement, value: Value, groupSeparator = ' | '): string {
  if (value === undefined) return '';
  switch (field.fieldType) {
    case 'checkbox':
      return Array.isArray(value) ? value.join('; ') : value;
    case 'signature':
      return '[signature]';
    case 'date':
      return typeof value === 'string' ? formatDate(value) : '';
    case 'group':
      return groupEntries(field, value)
        .map((entry, index) => `${field.itemLabel} ${index + 1}: ${entry}`)
        .join(groupSeparator);
    default:
      return Array.isArray(value) ? value.join('; ') : value;
  }
}
