import { AUTO_HEIGHT_PADDING } from '@/lib/constants';
import type { DocElement, FormDoc, PageSettings } from '@/types/doc';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type Axis = 'horizontal' | 'vertical';

export interface PositionPatch {
  id: string;
  x?: number;
  y?: number;
}

export function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

export function rectOf(el: Pick<DocElement, 'x' | 'y' | 'width' | 'height'>): Rect {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

export function roundRect(rect: Rect): Rect {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

/** True when the rectangles overlap by more than an edge. Touching edges do not intersect. */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function unionRect(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const r of rects) {
    left = Math.min(left, r.x);
    top = Math.min(top, r.y);
    right = Math.max(right, r.x + r.width);
    bottom = Math.max(bottom, r.y + r.height);
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Height of the page as drawn: grows with the content on auto-height (mobile) pages. */
export function displayHeight(doc: Pick<FormDoc, 'page' | 'elements'>): number {
  const { page, elements } = doc;
  if (!page.autoHeight) return page.height;
  let lowest = 0;
  for (const el of elements) {
    if (!el.hidden) lowest = Math.max(lowest, el.y + el.height);
  }
  return Math.max(page.height, lowest + AUTO_HEIGHT_PADDING);
}

/**
 * Keeps a rectangle on the page. Horizontally always. Vertically only on fixed-height pages
 * (auto-height pages grow instead), but y never goes above 0.
 */
export function clampToPage(
  rect: Rect,
  page: Pick<PageSettings, 'width' | 'autoHeight'>,
  pageHeight: number,
): Rect {
  const width = Math.min(rect.width, page.width);
  const x = clamp(rect.x, 0, page.width - width);
  if (page.autoHeight) return { x, y: Math.max(0, rect.y), width, height: rect.height };
  const height = Math.min(rect.height, pageHeight);
  return { x, y: clamp(rect.y, 0, pageHeight - height), width, height };
}

/**
 * Converts a screen point to document pixels.
 * `container` is the scroll container's bounding rect, `scroll` its scroll offset, and `pageOffset`
 * where the page's top-left sits inside the scrolled content (before zoom is applied to the page).
 */
export function screenToDoc(
  point: Point,
  container: Pick<DOMRect, 'left' | 'top'>,
  zoom: number,
  scroll: Point = { x: 0, y: 0 },
  pageOffset: Point = { x: 0, y: 0 },
): Point {
  return {
    x: (point.x - container.left + scroll.x - pageOffset.x) / zoom,
    y: (point.y - container.top + scroll.y - pageOffset.y) / zoom,
  };
}

export function snapToGrid(value: number, grid: number): number {
  if (grid <= 0) return value;
  return Math.round(value / grid) * grid;
}

/** Aligns elements to the edges or centers of their combined bounds. Returns position patches. */
export function alignElements(
  els: readonly Pick<DocElement, 'id' | 'x' | 'y' | 'width' | 'height'>[],
  mode: AlignMode,
): PositionPatch[] {
  const bounds = unionRect(els.map(rectOf));
  if (!bounds) return [];
  return els.map((el) => {
    switch (mode) {
      case 'left':
        return { id: el.id, x: Math.round(bounds.x) };
      case 'center':
        return { id: el.id, x: Math.round(bounds.x + (bounds.width - el.width) / 2) };
      case 'right':
        return { id: el.id, x: Math.round(bounds.x + bounds.width - el.width) };
      case 'top':
        return { id: el.id, y: Math.round(bounds.y) };
      case 'middle':
        return { id: el.id, y: Math.round(bounds.y + (bounds.height - el.height) / 2) };
      case 'bottom':
        return { id: el.id, y: Math.round(bounds.y + bounds.height - el.height) };
      default: {
        const unreachable: never = mode;
        return unreachable;
      }
    }
  });
}

/**
 * Spaces three or more elements so the gaps between them are equal, keeping the outermost two in
 * place. Fewer than three elements return no patches.
 */
export function distributeElements(
  els: readonly Pick<DocElement, 'id' | 'x' | 'y' | 'width' | 'height'>[],
  axis: Axis,
): PositionPatch[] {
  if (els.length < 3) return [];
  const horizontal = axis === 'horizontal';
  const start = (el: (typeof els)[number]) => (horizontal ? el.x : el.y);
  const length = (el: (typeof els)[number]) => (horizontal ? el.width : el.height);
  const sorted = [...els].sort((a, b) => start(a) - start(b));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) return [];
  const span = start(last) + length(last) - start(first);
  const totalLength = sorted.reduce((sum, el) => sum + length(el), 0);
  const gap = (span - totalLength) / (sorted.length - 1);
  let cursor = start(first);
  return sorted.map((el) => {
    const position = Math.round(cursor);
    cursor += length(el) + gap;
    return horizontal ? { id: el.id, x: position } : { id: el.id, y: position };
  });
}

/** Reading order for the fill page and list view: top to bottom, then left to right. */
export function byReadingOrder<T extends Pick<DocElement, 'x' | 'y'>>(a: T, b: T): number {
  return a.y - b.y || a.x - b.x;
}
