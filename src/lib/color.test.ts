import { describe, expect, it } from 'vitest';
import { normalizeHex } from '@/lib/color';

describe('normalizeHex', () => {
  it('normalizes long and short forms to uppercase #RRGGBB', () => {
    expect(normalizeHex('#ff9f1c')).toBe('#FF9F1C');
    expect(normalizeHex('ff9f1c')).toBe('#FF9F1C');
    expect(normalizeHex('#abc')).toBe('#AABBCC');
    expect(normalizeHex('  #0F0 ')).toBe('#00FF00');
  });
  it('rejects anything else', () => {
    for (const bad of ['', '#', '#12', '#12345', '#1234567', 'red', '#GGGGGG', 'rgb(1,2,3)']) {
      expect(normalizeHex(bad)).toBeNull();
    }
  });
});
