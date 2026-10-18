import { describe, expect, it } from 'vitest';
import {
  alignElements,
  byReadingOrder,
  clamp,
  clampToPage,
  displayHeight,
  distributeElements,
  rectsIntersect,
  screenToDoc,
  snapToGrid,
  unionRect,
} from '@/lib/geometry';
import { createBlankDoc } from '@/types/doc.schema';
import type { FormDoc, PagePreset } from '@/types/doc';

/** A blank page without the submit button, so tests see only the elements they add. */
const blankPage = (preset: PagePreset): FormDoc => ({ ...createBlankDoc(preset), elements: [] });

const box = (id: string, x: number, y: number, width: number, height: number) => ({
  id,
  x,
  y,
  width,
  height,
});

describe('clamp and grid', () => {
  it('clamps inside and outside the range, and tolerates min > max', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
    expect(clamp(5, 10, 0)).toBe(10);
  });
  it('snaps to a grid', () => {
    expect(snapToGrid(13, 10)).toBe(10);
    expect(snapToGrid(15, 10)).toBe(20);
    expect(snapToGrid(7, 0)).toBe(7);
  });
});

describe('rectangles', () => {
  it('detects overlap but not touching edges or zero-size rects', () => {
    expect(rectsIntersect(box('a', 0, 0, 10, 10), box('b', 5, 5, 10, 10))).toBe(true);
    expect(rectsIntersect(box('a', 0, 0, 10, 10), box('b', 10, 0, 10, 10))).toBe(false);
    expect(rectsIntersect(box('a', 0, 0, 0, 0), box('b', 0, 0, 10, 10))).toBe(false);
  });
  it('unions rectangles, including negative coordinates, and returns null for none', () => {
    expect(unionRect([])).toBeNull();
    expect(unionRect([box('a', -10, -5, 20, 10), box('b', 5, 5, 20, 20)])).toEqual({
      x: -10,
      y: -5,
      width: 35,
      height: 30,
    });
  });
});

describe('displayHeight', () => {
  it('is fixed for A4', () => {
    expect(displayHeight(blankPage('a4'))).toBe(1123);
  });
  it('is at least the minimum for mobile and grows past the lowest visible element', () => {
    const doc = blankPage('mobile');
    expect(displayHeight(doc)).toBe(844);
    doc.elements.push({
      id: 'l',
      type: 'line',
      name: 'Line',
      x: 0,
      y: 1000,
      width: 100,
      height: 2,
      locked: false,
      hidden: false,
      color: '#000000',
      thickness: 2,
      style: 'solid',
    });
    expect(displayHeight(doc)).toBe(1082);
    const first = doc.elements[0];
    if (first) first.hidden = true;
    expect(displayHeight(doc)).toBe(844);
  });
});

describe('clampToPage', () => {
  const mobile = { width: 390, autoHeight: true };
  const a4 = { width: 794, autoHeight: false };
  it('keeps elements inside horizontally', () => {
    expect(clampToPage(box('a', 300, 10, 200, 50), mobile, 844)).toMatchObject({
      x: 190,
      width: 200,
    });
    expect(clampToPage(box('a', -20, 10, 100, 50), mobile, 844).x).toBe(0);
  });
  it('shrinks elements wider than the page', () => {
    expect(clampToPage(box('a', 0, 0, 900, 50), mobile, 844).width).toBe(390);
  });
  it('lets mobile pages grow downward but not above zero', () => {
    expect(clampToPage(box('a', 0, 2000, 100, 50), mobile, 844).y).toBe(2000);
    expect(clampToPage(box('a', 0, -30, 100, 50), mobile, 844).y).toBe(0);
  });
  it('keeps A4 elements inside vertically', () => {
    expect(clampToPage(box('a', 0, 1100, 100, 50), a4, 1123).y).toBe(1073);
    expect(clampToPage(box('a', 0, 0, 100, 5000), a4, 1123).height).toBe(1123);
  });
});

describe('screenToDoc', () => {
  it('divides by zoom after removing the container offset and adding scroll', () => {
    expect(screenToDoc({ x: 300, y: 200 }, { left: 100, top: 50 }, 2)).toEqual({ x: 100, y: 75 });
    expect(screenToDoc({ x: 300, y: 200 }, { left: 100, top: 50 }, 2, { x: 40, y: 0 })).toEqual({
      x: 120,
      y: 75,
    });
    expect(
      screenToDoc({ x: 300, y: 200 }, { left: 100, top: 50 }, 1, { x: 0, y: 0 }, { x: 80, y: 80 }),
    ).toEqual({ x: 120, y: 70 });
  });
});

describe('align', () => {
  const els = [box('a', 10, 20, 50, 20), box('b', 100, 0, 30, 40), box('c', 40, 60, 80, 10)];
  it('aligns to the edges and centers of the combined bounds', () => {
    expect(alignElements(els, 'left').map((p) => p.x)).toEqual([10, 10, 10]);
    expect(alignElements(els, 'right').map((p) => p.x)).toEqual([80, 100, 50]);
    expect(alignElements(els, 'center').map((p) => p.x)).toEqual([45, 55, 30]);
    expect(alignElements(els, 'top').map((p) => p.y)).toEqual([0, 0, 0]);
    expect(alignElements(els, 'bottom').map((p) => p.y)).toEqual([50, 30, 60]);
    expect(alignElements(els, 'middle').map((p) => p.y)).toEqual([25, 15, 30]);
  });
  it('returns nothing for no elements', () => {
    expect(alignElements([], 'left')).toEqual([]);
  });
});

describe('distribute', () => {
  it('makes gaps equal and keeps the outer two in place', () => {
    const els = [box('a', 0, 0, 10, 10), box('b', 15, 0, 20, 10), box('c', 90, 0, 10, 10)];
    expect(distributeElements(els, 'horizontal')).toEqual([
      { id: 'a', x: 0 },
      { id: 'b', x: 40 },
      { id: 'c', x: 90 },
    ]);
  });
  it('distributes vertically and sorts by position', () => {
    const els = [box('c', 0, 100, 10, 10), box('a', 0, 0, 10, 10), box('b', 0, 20, 10, 10)];
    expect(distributeElements(els, 'vertical')).toEqual([
      { id: 'a', y: 0 },
      { id: 'b', y: 50 },
      { id: 'c', y: 100 },
    ]);
  });
  it('needs at least three elements', () => {
    expect(distributeElements([box('a', 0, 0, 1, 1), box('b', 9, 0, 1, 1)], 'horizontal')).toEqual(
      [],
    );
  });
});

describe('reading order', () => {
  it('sorts by y then x', () => {
    const items = [box('c', 0, 50, 1, 1), box('b', 100, 10, 1, 1), box('a', 5, 10, 1, 1)];
    expect([...items].sort(byReadingOrder).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });
});
