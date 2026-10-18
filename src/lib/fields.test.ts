import { describe, expect, it } from 'vitest';
import { inputTop, labelHeight, minFieldHeight, optionListHeight } from '@/lib/fields';

describe('field geometry', () => {
  it('uses 1.3x for the label line and a 6px gap', () => {
    expect(labelHeight(14)).toBe(18);
    expect(inputTop(14)).toBe(24);
  });
  it('gives radio and checkbox 32px per option', () => {
    expect(optionListHeight(14, 2)).toBe(88);
    expect(optionListHeight(14, 5)).toBe(184);
  });
  it('computes minimum heights per field type', () => {
    const labelStyle = {
      fontFamily: 'dm-sans',
      fontSize: 14,
      fontWeight: 700,
      color: '#000000',
    } as const;
    expect(minFieldHeight({ fieldType: 'text', labelStyle, options: [] })).toBe(56);
    expect(minFieldHeight({ fieldType: 'signature', labelStyle, options: [] })).toBe(144);
    expect(minFieldHeight({ fieldType: 'radio', labelStyle, options: ['a', 'b', 'c'] })).toBe(120);
  });
});
