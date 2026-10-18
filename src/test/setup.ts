import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

/**
 * jsdom has no canvas, so text measurement is mocked for tests only:
 * every character is 0.5 x the font size wide, ascent is 0.8 and descent 0.2 of the size.
 */
function fontSizeOf(font: string): number {
  const match = /(\d+(?:\.\d+)?)px/.exec(font);
  return match?.[1] ? Number(match[1]) : 16;
}

vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: unknown) {
  const ctx = {
    font: '16px sans-serif',
    fontKerning: 'auto',
    measureText(text: string) {
      const size = fontSizeOf(ctx.font);
      return {
        width: text.length * 0.5 * size,
        fontBoundingBoxAscent: size * 0.8,
        fontBoundingBoxDescent: size * 0.2,
      };
    },
  };
  return ctx as unknown as CanvasRenderingContext2D;
} as unknown as typeof HTMLCanvasElement.prototype.getContext);
