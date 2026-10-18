import { describe, expect, it } from 'vitest';
import { cleanOptions } from './OptionsEditor';

describe('cleanOptions', () => {
  it('trims, drops blanks, and keeps the first of duplicates', () => {
    expect(cleanOptions([' A ', '', 'B', 'A', '  '])).toEqual(['A', 'B']);
  });
  it('keeps at most 50 options', () => {
    const many = Array.from({ length: 80 }, (_, i) => `Option ${i}`);
    expect(cleanOptions(many)).toHaveLength(50);
  });
  it('returns an empty list when every row is blank', () => {
    expect(cleanOptions(['', '  '])).toEqual([]);
  });
});
