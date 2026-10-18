import { FIELD_ROW_HEIGHT, MAX_GROUP_ROWS } from '@/lib/constants';
import { inputTop } from '@/lib/fields';
import type { FieldElement, FormDoc, GroupColumn, GroupColumnType } from '@/types/doc';

/**
 * Repeating groups ("Add person"): one field that holds a list of small forms. These functions
 * decide where everything goes, and the screen and the PDF both draw from them, so they agree.
 */

export const GROUP_PAD = 12;
export const GROUP_HEADER = 32;
export const GROUP_CELL_GAP = 12;
export const GROUP_ROW_GAP = 12;
export const GROUP_ADD_GAP = 12;
export const GROUP_ADD_HEIGHT = 40;
const BOX_HEIGHT = 48;

export type GroupRowValue = Record<string, string>;

/** Answers for a group are stored as a JSON list of rows keyed by column id (see schema.md). */
export function parseRows(value: string | string[] | undefined): GroupRowValue[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_GROUP_ROWS).map((row): GroupRowValue => {
      const clean: GroupRowValue = {};
      if (typeof row === 'object' && row !== null) {
        for (const [key, cell] of Object.entries(row)) {
          if (typeof cell === 'string') clean[key] = cell;
        }
      }
      return clean;
    });
  } catch {
    return [];
  }
}

export function stringifyRows(rows: readonly GroupRowValue[]): string {
  return JSON.stringify(rows);
}

export function isRowEmpty(row: GroupRowValue): boolean {
  return Object.values(row).every((cell) => cell.trim() === '');
}

const COLUMN_FIELD_TYPE: Record<GroupColumnType, FieldElement['fieldType']> = {
  text: 'text',
  number: 'text',
  date: 'date',
  dropdown: 'dropdown',
  radio: 'radio',
};

export function columnHeight(col: GroupColumn, labelFontSize: number): number {
  const top = inputTop(labelFontSize);
  return col.type === 'radio' ? top + col.options.length * FIELD_ROW_HEIGHT : top + BOX_HEIGHT;
}

export interface CellLayout {
  column: GroupColumn;
  /** Relative to the group's top left corner, in document px. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RowLayout {
  y: number;
  height: number;
  cells: CellLayout[];
}

export interface GroupLayout {
  height: number;
  rows: RowLayout[];
  /** Where the add button goes, or null when the maximum is reached. */
  addButton: { y: number; height: number } | null;
}

type GroupShape = Pick<
  FieldElement,
  'columns' | 'perRow' | 'width' | 'labelStyle' | 'maxRows' | 'minRows'
>;

function layoutRow(el: GroupShape, top: number): RowLayout {
  const inner = el.width - GROUP_PAD * 2;
  const per = el.columns.length < 2 ? 1 : el.perRow;
  const cellWidth = (inner - GROUP_CELL_GAP * (per - 1)) / per;
  const cells: CellLayout[] = [];
  let y = GROUP_HEADER;
  for (let start = 0; start < el.columns.length; start += per) {
    const line = el.columns.slice(start, start + per);
    const lineHeight = Math.max(...line.map((c) => columnHeight(c, el.labelStyle.fontSize)));
    line.forEach((column, index) => {
      cells.push({
        column,
        x: GROUP_PAD + index * (cellWidth + GROUP_CELL_GAP),
        y,
        width: Math.round(cellWidth),
        height: columnHeight(column, el.labelStyle.fontSize),
      });
    });
    y += lineHeight + GROUP_CELL_GAP;
  }
  const height = Math.round(y - GROUP_CELL_GAP + GROUP_PAD);
  return { y: top, height, cells };
}

/** Positions for `rowCount` entries. Everything is whole pixels so edges stay crisp. */
export function layoutGroup(el: GroupShape, rowCount: number): GroupLayout {
  const rows: RowLayout[] = [];
  let y = inputTop(el.labelStyle.fontSize);
  for (let i = 0; i < rowCount; i += 1) {
    const row = layoutRow(el, y);
    rows.push(row);
    y += row.height + GROUP_ROW_GAP;
  }
  if (rowCount > 0) y -= GROUP_ROW_GAP;
  const canAdd = rowCount < el.maxRows;
  const addTop = y + (rowCount > 0 ? GROUP_ADD_GAP : 0);
  const height = canAdd ? addTop + GROUP_ADD_HEIGHT : y;
  return {
    height,
    rows,
    addButton: canAdd ? { y: addTop, height: GROUP_ADD_HEIGHT } : null,
  };
}

/** The height stored on the element: the design shows at least one sample entry. */
export function groupDesignHeight(el: GroupShape): number {
  return layoutGroup(el, Math.max(1, el.minRows)).height;
}

/** A column as the field it behaves like, so the normal field views and PDF code can draw it. */
export function cellField(
  group: FieldElement,
  rowIndex: number,
  cell: CellLayout,
  offset: { x: number; y: number } = { x: 0, y: 0 },
): FieldElement {
  const { column } = cell;
  return {
    ...group,
    id: `${group.id}.${rowIndex}.${column.id}`,
    key: `${group.key}__${rowIndex}__${column.id}`,
    name: column.label,
    fieldType: COLUMN_FIELD_TYPE[column.type],
    label: column.label,
    placeholder: '',
    required: column.required,
    validation: column.type === 'number' ? 'number' : 'none',
    options: column.options,
    columns: [],
    x: offset.x + cell.x,
    y: offset.y + cell.y,
    width: cell.width,
    height: cell.height,
    locked: false,
    hidden: false,
  };
}

export function splitCellId(id: string): { groupId: string; row: number; column: string } | null {
  const [groupId, row, ...rest] = id.split('.');
  const column = rest.join('.');
  const index = Number(row);
  if (!groupId || !column || !Number.isInteger(index)) return null;
  return { groupId, row: index, column };
}

/** A fresh column with a unique id. */
export function newColumn(existing: readonly GroupColumn[], label = 'Question'): GroupColumn {
  const taken = new Set(existing.map((c) => c.id));
  let n = existing.length + 1;
  while (taken.has(`c${n}`)) n += 1;
  return { id: `c${n}`, label, type: 'text', required: false, options: [] };
}

/**
 * The page as a respondent sees it once groups have grown or shrunk: every group gets the height
 * of its current entries, and whatever sits below a group moves down (or up) with it. Items beside
 * a group or above it stay put.
 */
export function applyGroupRows(doc: FormDoc, rows: Record<string, number>): FormDoc {
  const groups = doc.elements.filter(
    (el): el is FieldElement => el.type === 'field' && el.fieldType === 'group' && !el.hidden,
  );
  if (groups.length === 0) return doc;
  const deltas = groups.map((group) => {
    const count = Math.min(rows[group.id] ?? Math.max(1, group.minRows), group.maxRows);
    const height = layoutGroup(group, count).height;
    return { group, height, delta: height - group.height };
  });
  if (deltas.every((d) => d.delta === 0)) return doc;
  const elements = doc.elements.map((el) => {
    const own = deltas.find((d) => d.group.id === el.id);
    if (own) return { ...el, height: own.height };
    const shift = deltas
      .filter((d) => el.y >= d.group.y + d.group.height)
      .reduce((sum, d) => sum + d.delta, 0);
    return shift === 0 ? el : { ...el, y: el.y + shift };
  });
  const lowest = Math.max(0, ...elements.filter((el) => !el.hidden).map((el) => el.y + el.height));
  const page = doc.page.autoHeight
    ? doc.page
    : { ...doc.page, height: Math.max(doc.page.height, lowest + doc.page.margin) };
  return { ...doc, page, elements };
}

/** How many entries each group currently has, given the answers. */
export function groupRowCounts(
  doc: Pick<FormDoc, 'elements'>,
  answers: Record<string, string | string[]>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const el of doc.elements) {
    if (el.type === 'field' && el.fieldType === 'group') {
      counts[el.id] = parseRows(answers[el.id]).length;
    }
  }
  return counts;
}
