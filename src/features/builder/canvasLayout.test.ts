import { describe, expect, it } from 'vitest';
import { canvasLayout, fitZoom } from './canvasLayout';

describe('canvasLayout', () => {
  it('centers a page that is narrower than the viewport', () => {
    const layout = canvasLayout({ width: 1000, height: 700 }, 390, 844, 1);
    expect(layout.offsetX).toBe(305);
    expect(layout.sizerWidth).toBe(1000);
    expect(layout.sizerHeight).toBe(844 + 160);
  });
  it('makes the content wider than the viewport when the page is bigger, with padding', () => {
    const layout = canvasLayout({ width: 600, height: 700 }, 794, 1123, 1);
    expect(layout.sizerWidth).toBe(794 + 160);
    expect(layout.offsetX).toBe(80);
  });
  it('scales the page size by zoom', () => {
    expect(canvasLayout({ width: 600, height: 700 }, 390, 844, 2).sizerWidth).toBe(780 + 160);
  });
});

describe('fitZoom', () => {
  it('fits the width but never above 100%', () => {
    expect(fitZoom(1000, 390)).toBe(1);
    expect(fitZoom(634, 794)).toBeCloseTo(0.597, 2);
    expect(fitZoom(0, 794)).toBe(1);
  });
});
