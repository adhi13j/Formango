import { describe, expect, it } from 'vitest';
import { dataUrlBytes, fitWithin, ImageError, validateImageFile } from '@/lib/images';

describe('fitWithin', () => {
  it('scales the long side down to the maximum and keeps the ratio', () => {
    expect(fitWithin(3200, 1600, 1600)).toEqual({ width: 1600, height: 800 });
    expect(fitWithin(1000, 4000, 1600)).toEqual({ width: 400, height: 1600 });
  });
  it('never scales up', () => {
    expect(fitWithin(300, 200, 1600)).toEqual({ width: 300, height: 200 });
  });
});

describe('validateImageFile', () => {
  const file = (type: string, size: number, name = 'a.png') => ({ type, size, name });
  it('accepts png, jpeg, and webp under 5 MB', () => {
    expect(() => validateImageFile(file('image/png', 1000))).not.toThrow();
    expect(() => validateImageFile(file('image/jpeg', 1000, 'a.jpg'))).not.toThrow();
    expect(() => validateImageFile(file('image/webp', 1000, 'a.webp'))).not.toThrow();
  });
  it('rejects svg with an explanation, even with a wrong mime type', () => {
    expect(() => validateImageFile(file('image/svg+xml', 10, 'a.svg'))).toThrow(/scripts/);
    expect(() => validateImageFile(file('image/png', 10, 'evil.svg'))).toThrow(ImageError);
  });
  it('rejects other types and files over 5 MB', () => {
    expect(() => validateImageFile(file('application/pdf', 10, 'a.pdf'))).toThrow(
      /PNG, JPG, or WebP/,
    );
    expect(() => validateImageFile(file('image/png', 6 * 1024 * 1024))).toThrow(/5 MB/);
  });
});

describe('dataUrlBytes', () => {
  it('estimates the decoded size of a data URL', () => {
    expect(dataUrlBytes('data:image/png;base64,AAAA')).toBe(3);
    expect(dataUrlBytes(`data:image/png;base64,${'A'.repeat(4000)}`)).toBe(3000);
  });
});
