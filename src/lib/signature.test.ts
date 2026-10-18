import { describe, expect, it } from 'vitest';
import { inkBounds, signatureScale } from './signature';

function pixels(width: number, height: number, inked: [number, number][]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const [x, y] of inked) data[(y * width + x) * 4 + 3] = 255;
  return data;
}

describe('inkBounds', () => {
  it('returns null for a blank canvas', () => {
    expect(inkBounds(pixels(10, 10, []), 10, 10)).toBeNull();
  });
  it('finds the box around all inked pixels', () => {
    const data = pixels(20, 10, [
      [3, 2],
      [12, 7],
      [8, 4],
    ]);
    expect(inkBounds(data, 20, 10)).toEqual({ x: 3, y: 2, width: 10, height: 6 });
  });
  it('handles a single pixel', () => {
    expect(inkBounds(pixels(5, 5, [[4, 0]]), 5, 5)).toEqual({ x: 4, y: 0, width: 1, height: 1 });
  });
});

describe('signatureScale', () => {
  it('never enlarges a small signature', () => {
    expect(signatureScale(100, 50)).toBe(1);
  });
  it('fits a wide signature to 400 wide', () => {
    expect(signatureScale(800, 100)).toBe(0.5);
  });
  it('fits a tall signature to 150 high', () => {
    expect(signatureScale(100, 300)).toBe(0.5);
  });
});
