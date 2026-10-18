import type { Rect } from '@/lib/geometry';
import { displayHeight } from '@/lib/geometry';
import type { FormDoc } from '@/types/doc';

export interface SnapLines {
  /** x positions of vertical lines, in document px */
  xs: number[];
  /** y positions of horizontal lines, in document px */
  ys: number[];
}

export interface SnapResult {
  dx: number;
  dy: number;
  /** vertical guide lines (x) that are active, to draw */
  guideXs: number[];
  /** horizontal guide lines (y) that are active, to draw */
  guideYs: number[];
}

export const NO_SNAP: SnapResult = { dx: 0, dy: 0, guideXs: [], guideYs: [] };

/** Which edges move during a resize: -1 left/top, 1 right/bottom, 0 none. Matches Moveable's direction. */
export type ResizeDirection = [number, number];

/** Columns of the layout grid, as [left, right] pairs in document px. */
export function gridColumns(doc: Pick<FormDoc, 'page'>): [number, number][] {
  const { page } = doc;
  if (page.preset === 'mobile') {
    const inner = page.width - page.margin * 2;
    const half = (inner - 10) / 2;
    return [
      [page.margin, page.margin + inner],
      [page.margin, page.margin + half],
      [page.margin + half + 10, page.margin + inner],
    ];
  }
  const gutter = 6;
  const count = 12;
  const inner = page.width - page.margin * 2;
  const width = (inner - gutter * (count - 1)) / count;
  return Array.from({ length: count }, (_, i): [number, number] => {
    const left = page.margin + i * (width + gutter);
    return [left, left + width];
  });
}

/**
 * Lines a moving element can snap to: page edges and center, page margins, optional layout grid
 * columns, and the edges and centers of other visible elements.
 */
export function buildSnapLines(
  doc: Pick<FormDoc, 'page' | 'elements'>,
  excludeIds: ReadonlySet<string>,
  gridEnabled: boolean,
): SnapLines {
  const { page } = doc;
  const height = displayHeight(doc);
  const xs = new Set<number>([
    0,
    page.width / 2,
    page.width,
    page.margin,
    page.width - page.margin,
  ]);
  const ys = new Set<number>([0, page.margin]);
  if (!page.autoHeight) {
    ys.add(height / 2);
    ys.add(height);
    ys.add(height - page.margin);
  }
  if (gridEnabled) {
    for (const [left, right] of gridColumns(doc)) {
      xs.add(left);
      xs.add(right);
    }
  }
  for (const el of doc.elements) {
    if (el.hidden || excludeIds.has(el.id)) continue;
    xs.add(el.x)
      .add(el.x + el.width / 2)
      .add(el.x + el.width);
    ys.add(el.y)
      .add(el.y + el.height / 2)
      .add(el.y + el.height);
  }
  return { xs: [...xs], ys: [...ys] };
}

function nearest(
  candidates: readonly number[],
  lines: readonly number[],
  threshold: number,
): { delta: number; line: number } | null {
  let best: { delta: number; line: number } | null = null;
  for (const candidate of candidates) {
    for (const line of lines) {
      const delta = line - candidate;
      if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
        best = { delta, line };
      }
    }
  }
  return best;
}

/** Collects every line that the snapped candidates now sit exactly on, so all of them are drawn. */
function activeLines(
  candidates: readonly number[],
  lines: readonly number[],
  shift: number,
): number[] {
  const active = new Set<number>();
  for (const candidate of candidates) {
    for (const line of lines) {
      if (Math.abs(candidate + shift - line) < 0.5) active.add(line);
    }
  }
  return [...active];
}

/** Snaps a dragged rectangle: its left, center, and right edges to vertical lines, and top, middle, bottom to horizontal. */
export function snapMove(rect: Rect, lines: SnapLines, threshold: number): SnapResult {
  const xCandidates = [rect.x, rect.x + rect.width / 2, rect.x + rect.width];
  const yCandidates = [rect.y, rect.y + rect.height / 2, rect.y + rect.height];
  const snapX = nearest(xCandidates, lines.xs, threshold);
  const snapY = nearest(yCandidates, lines.ys, threshold);
  const dx = snapX?.delta ?? 0;
  const dy = snapY?.delta ?? 0;
  return {
    dx,
    dy,
    guideXs: snapX ? activeLines(xCandidates, lines.xs, dx) : [],
    guideYs: snapY ? activeLines(yCandidates, lines.ys, dy) : [],
  };
}

/**
 * Snaps only the edges that a resize handle is moving. `dx` and `dy` are the amounts to add to the
 * moving edge(s), so the caller can adjust width/height (and x/y for left/top handles).
 */
export function snapResize(
  rect: Rect,
  direction: ResizeDirection,
  lines: SnapLines,
  threshold: number,
): SnapResult {
  const [horizontal, vertical] = direction;
  const xEdge = horizontal === 0 ? [] : [horizontal < 0 ? rect.x : rect.x + rect.width];
  const yEdge = vertical === 0 ? [] : [vertical < 0 ? rect.y : rect.y + rect.height];
  const snapX = nearest(xEdge, lines.xs, threshold);
  const snapY = nearest(yEdge, lines.ys, threshold);
  const dx = snapX?.delta ?? 0;
  const dy = snapY?.delta ?? 0;
  return {
    dx,
    dy,
    guideXs: snapX ? activeLines(xEdge, lines.xs, dx) : [],
    guideYs: snapY ? activeLines(yEdge, lines.ys, dy) : [],
  };
}
