import { describe, expect, it } from 'vitest';
import { createBlankDoc } from '@/types/doc.schema';
import { hexToRgb01, pdfGeometry, toPdfRect, toPdfY } from './units';

describe('pdfGeometry', () => {
  it('maps the A4 preset onto one A4 page', () => {
    const g = pdfGeometry(createBlankDoc('a4'));
    expect(g.width).toBe(595.28);
    expect(g.height).toBe(841.89);
    expect(g.scale).toBeCloseTo(595.28 / 794, 6);
  });

  it('makes a mobile page as wide as A4 and as tall as the design', () => {
    const doc = createBlankDoc('mobile');
    const g = pdfGeometry(doc);
    expect(g.width).toBe(595.28);
    expect(g.height).toBeCloseTo(844 * (595.28 / 390), 4);
  });
});

describe('toPdfRect', () => {
  it('flips y so the origin is the bottom left', () => {
    const g = { scale: 2, width: 200, height: 400 };
    expect(toPdfRect(g, { x: 10, y: 20, width: 30, height: 40 })).toEqual({
      x: 20,
      y: 400 - 120,
      width: 60,
      height: 80,
    });
  });
  it('a rectangle at the top of the page ends at the top in PDF space', () => {
    const g = { scale: 1, width: 100, height: 100 };
    const r = toPdfRect(g, { x: 0, y: 0, width: 100, height: 10 });
    expect(r.y + r.height).toBe(100);
  });
});

describe('toPdfY', () => {
  it('measures down from the top', () => {
    expect(toPdfY({ scale: 0.5, width: 1, height: 300 }, 100)).toBe(250);
  });
});

describe('hexToRgb01', () => {
  it('converts hex to unit channels', () => {
    expect(hexToRgb01('#FF0000')).toEqual([1, 0, 0]);
    const [r, g, b] = hexToRgb01('#FF9F1C');
    expect(r).toBe(1);
    expect(g).toBeCloseTo(0.6235, 3);
    expect(b).toBeCloseTo(0.1098, 3);
  });
});
