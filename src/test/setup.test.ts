import { describe, expect, it } from 'vitest';

describe('test setup', () => {
  it('mocks canvas text measurement as 0.5 x font size per character', () => {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) throw new Error('expected a mocked 2d context');
    ctx.font = '700 20px Poppins';
    expect(ctx.measureText('abcd').width).toBe(40);
  });
});
