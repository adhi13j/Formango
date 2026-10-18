import { describe, expect, it } from 'vitest';
import { createElement } from '@/lib/elements';
import type { FieldElement, FormDoc } from '@/types/doc';
import { createBlankDoc } from '@/types/doc.schema';
import { stringifyRows } from './groups';
import { buildCsv, csvCell, csvFileName } from './csv';

const blank = createBlankDoc('mobile');
const field = (kind: Parameters<typeof createElement>[0], patch: Partial<FieldElement>) =>
  ({ ...createElement(kind, blank), ...patch }) as FieldElement;

describe('csvCell', () => {
  it('quotes everything and doubles inner quotes', () => {
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
  });
  it.each(['=SUM(A1)', '+1 555', '-2', '@cmd', '\tx', '\rx'])('neutralizes %j', (value) => {
    expect(csvCell(value)).toBe(`"'${value}"`);
  });
  it('leaves normal text alone, including accents', () => {
    expect(csvCell('Café')).toBe('"Café"');
  });
});

describe('buildCsv', () => {
  const name = field('field-text', { id: 'n', label: 'Name', y: 10, x: 20 });
  const email = field('field-text', { id: 'e', label: 'Name', y: 100, x: 20 });
  const boxes = field('field-checkbox', {
    id: 'c',
    label: 'Diet',
    y: 200,
    x: 20,
    options: ['A', 'B'],
  });
  const sign = field('field-signature', { id: 's', label: 'Sign', y: 300, x: 20 });
  const when = field('field-date', { id: 'd', label: 'When', y: 400, x: 20 });
  const family = field('field-group', { id: 'g', label: 'Family', y: 500, x: 20 });
  const doc: FormDoc = { ...blank, elements: [boxes, email, name, sign, when, family] };

  it('orders columns top to bottom and numbers duplicate headers', () => {
    const csv = buildCsv(doc, []);
    expect(csv.split('\r\n')[0]?.replace('\uFEFF', '')).toBe(
      '"Submitted at","Name","Name (2)","Diet","Sign","When","Family"',
    );
  });
  it('starts with a BOM, joins checkboxes, and marks signatures', () => {
    const csv = buildCsv(doc, [
      {
        createdAt: '2026-03-04T10:00:00Z',
        answers: {
          n: 'Asha, "A"',
          c: ['A', 'B'],
          s: 'data:image/png;base64,AAAA',
          d: '2026-03-04',
        },
      },
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.split('\r\n')[1]).toBe(
      '"2026-03-04T10:00:00Z","Asha, ""A""","","A; B","[signature]","04 Mar 2026",""',
    );
  });
  it('writes repeating group entries on one cell', () => {
    const answers = {
      g: stringifyRows([
        { c1: 'Asha', c2: 'Mother' },
        { c1: 'Ravi', c3: 'Deceased' },
      ]),
    };
    const csv = buildCsv(doc, [{ createdAt: 'T', answers }]);
    expect(csv).toContain(
      'Person 1: Name: Asha; Relationship: Mother | Person 2: Name: Ravi; Status: Deceased',
    );
  });
  it('keeps answers for deleted fields in trailing columns', () => {
    const csv = buildCsv(doc, [{ createdAt: 'T', answers: { gone: 'x', gone2: 'y' } }]);
    const [head, row] = csv.split('\r\n');
    expect(head?.endsWith('"(removed field)","(removed field 2)"')).toBe(true);
    expect(row?.endsWith('"x","y"')).toBe(true);
  });
  it('guards formulas in answers', () => {
    const csv = buildCsv(doc, [{ createdAt: 'T', answers: { n: '=1+1' } }]);
    expect(csv).toContain('"\'=1+1"');
  });
});

describe('csvFileName', () => {
  it('slugs the title and adds the date', () => {
    expect(csvFileName('Event Registration', new Date('2026-03-04T00:00:00Z'))).toBe(
      'event-registration-responses-2026-03-04.csv',
    );
  });
});
