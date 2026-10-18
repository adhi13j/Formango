import { describe, expect, it } from 'vitest';
import { createElement } from '@/lib/elements';
import { cleanAnswers, errorOrder, validateAnswers } from '@/lib/answers';
import type { FieldElement, FormDoc } from '@/types/doc';
import { createBlankDoc } from '@/types/doc.schema';
import {
  applyGroupRows,
  GROUP_ROW_GAP,
  groupDesignHeight,
  groupRowCounts,
  isRowEmpty,
  layoutGroup,
  parseRows,
  splitCellId,
  stringifyRows,
} from './groups';

const blank = createBlankDoc('mobile');
const group = (patch: Partial<FieldElement> = {}) =>
  ({ ...createElement('field-group', blank), id: 'g', y: 100, ...patch }) as FieldElement;

describe('rows as answers', () => {
  it('round-trips and ignores anything that is not a list of text cells', () => {
    const rows: Record<string, string>[] = [{ a: 'Asha', b: 'Mother' }, {}];
    expect(parseRows(stringifyRows(rows))).toEqual(rows);
    expect(parseRows(undefined)).toEqual([]);
    expect(parseRows('not json')).toEqual([]);
    expect(parseRows('{"a":1}')).toEqual([]);
    expect(parseRows('[{"a":5,"b":"ok"}]')).toEqual([{ b: 'ok' }]);
  });
  it('knows an empty row', () => {
    expect(isRowEmpty({})).toBe(true);
    expect(isRowEmpty({ a: '  ' })).toBe(true);
    expect(isRowEmpty({ a: 'x' })).toBe(false);
  });
  it('splits cell ids', () => {
    expect(splitCellId('g.2.c1')).toEqual({ groupId: 'g', row: 2, column: 'c1' });
    expect(splitCellId('g')).toBeNull();
  });
});

describe('layoutGroup', () => {
  it('stacks the questions of an entry and grows by one entry height per entry', () => {
    const g = group();
    const one = layoutGroup(g, 1);
    const two = layoutGroup(g, 2);
    const rowHeight = one.rows[0]?.height ?? 0;
    expect(two.height - one.height).toBe(rowHeight + GROUP_ROW_GAP);
    expect(one.rows[0]?.cells.map((c) => c.y)).toEqual([32, 116, 200]);
  });
  it('puts two questions on one line when asked', () => {
    const wide = layoutGroup({ ...group(), perRow: 2 }, 1);
    const cells = wide.rows[0]?.cells ?? [];
    expect(cells[0]?.y).toBe(cells[1]?.y);
    expect((cells[1]?.x ?? 0) > (cells[0]?.x ?? 0)).toBe(true);
    expect(wide.height).toBeLessThan(layoutGroup(group(), 1).height);
  });
  it('hides the add button at the maximum', () => {
    expect(layoutGroup({ ...group(), maxRows: 1 }, 1).addButton).toBeNull();
    expect(layoutGroup({ ...group(), maxRows: 2 }, 1).addButton).not.toBeNull();
  });
  it('is only the title and the button with no entries', () => {
    const empty = layoutGroup(group(), 0);
    expect(empty.rows).toHaveLength(0);
    expect(empty.height).toBe(24 + 40);
  });
  it('designs with at least one sample entry', () => {
    expect(groupDesignHeight({ ...group(), minRows: 0 })).toBe(layoutGroup(group(), 1).height);
    expect(groupDesignHeight({ ...group(), minRows: 3 })).toBe(layoutGroup(group(), 3).height);
  });
  it('a new group is stored at its design height', () => {
    expect(group().height).toBe(groupDesignHeight(group()));
  });
});

describe('applyGroupRows', () => {
  const below = { ...createElement('heading', blank), id: 'below', y: 0 };
  const beside = { ...createElement('heading', blank), id: 'beside', y: 0 };
  const above = { ...createElement('heading', blank), id: 'above', y: 10 };
  const build = (g: FieldElement): FormDoc => {
    const placed = { ...below, y: g.y + g.height + 20 };
    return { ...blank, elements: [{ ...above }, g, { ...beside, y: g.y + 5 }, placed] };
  };

  it('moves what is below a group by the extra height and leaves the rest alone', () => {
    const g = group();
    const doc = build(g);
    const grown = applyGroupRows(doc, { g: 3 });
    const extra = layoutGroup(g, 3).height - g.height;
    const find = (id: string) => grown.elements.find((e) => e.id === id);
    expect(find('below')?.y).toBe((doc.elements[3]?.y ?? 0) + extra);
    expect(find('above')?.y).toBe(10);
    expect(find('beside')?.y).toBe(g.y + 5);
    expect(find('g')?.height).toBe(layoutGroup(g, 3).height);
  });
  it('moves things up when a group has fewer entries than its design', () => {
    const g = group({ minRows: 0 });
    const doc = build(g);
    const none = applyGroupRows(doc, { g: 0 });
    expect(none.elements.find((e) => e.id === 'below')?.y).toBeLessThan(doc.elements[3]?.y ?? 0);
  });
  it('returns the same document when nothing changes', () => {
    const doc = build(group());
    expect(applyGroupRows(doc, { g: 1 })).toBe(doc);
    expect(applyGroupRows({ ...blank, elements: [above] }, {})).toEqual({
      ...blank,
      elements: [above],
    });
  });
  it('lets a fixed-height page grow to hold the extra entries', () => {
    const a4 = createBlankDoc('a4');
    const g = group({ y: 900, width: 714 });
    const grown = applyGroupRows({ ...a4, elements: [g] }, { g: 4 });
    expect(grown.page.height).toBeGreaterThan(1123);
  });
  it('counts entries from the answers', () => {
    const doc = { ...blank, elements: [group()] };
    expect(groupRowCounts(doc, { g: stringifyRows([{}, {}]) })).toEqual({ g: 2 });
    expect(groupRowCounts(doc, {})).toEqual({ g: 0 });
  });
});

describe('group validation and clean answers', () => {
  const doc = (g: FieldElement): FormDoc => ({ ...blank, elements: [g] });
  it('asks for at least one entry when required', () => {
    const g = group({ required: true });
    expect(validateAnswers(doc(g), {})).toEqual({ g: 'Add at least one person' });
    expect(validateAnswers(doc(g), { g: stringifyRows([{}]) })).toEqual(
      expect.objectContaining({ g: 'Add at least one person' }),
    );
  });
  it('enforces the fewest entries', () => {
    const g = group({ minRows: 2 });
    const one = stringifyRows([{ c1: 'A', c2: 'B' }]);
    expect(validateAnswers(doc(g), { g: one }).g).toBe('Add at least 2 person entries');
  });
  it('reports required questions inside an entry by cell id', () => {
    const g = group();
    const errors = validateAnswers(doc(g), { g: stringifyRows([{ c1: 'Asha' }]) });
    expect(errors).toEqual({ 'g.0.c2': 'This field is required' });
    expect(errorOrder(doc(g), errors)).toEqual(['g']);
  });
  it('checks choices inside entries', () => {
    const g = group();
    const errors = validateAnswers(doc(g), {
      g: stringifyRows([{ c1: 'A', c2: 'B', c3: 'Missing' }]),
    });
    expect(errors['g.0.c3']).toBe('Pick one of the options');
  });
  it('stores only filled entries and cells, trimmed, and nothing when all are empty', () => {
    const g = group();
    const rows = stringifyRows([{ c1: ' Asha ', c2: 'Mother', c3: '' }, {}, { c1: ' ' }]);
    expect(cleanAnswers(doc(g), { g: rows })).toEqual({
      g: stringifyRows([{ c1: 'Asha', c2: 'Mother' }]),
    });
    expect(cleanAnswers(doc(g), { g: stringifyRows([{}]) })).toEqual({});
  });
});
