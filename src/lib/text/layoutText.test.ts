import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearTextCaches,
  fontMetrics,
  layoutText,
  measureText,
  truncateToWidth,
  type LayoutInput,
} from '@/lib/text/layoutText';

// The test canvas mock makes every character 0.5 x font size wide, so at 10px one character is 5px.
const base: LayoutInput = {
  text: '',
  fontFamily: 'dm-sans',
  fontSize: 10,
  fontWeight: 400,
  maxWidth: 50, // 10 characters per line
  lineHeight: 1.5,
};

beforeEach(() => clearTextCaches());

describe('measureText', () => {
  it('sums per-character advances', () => {
    expect(measureText('abcd', 'dm-sans', 10, 400)).toBe(20);
    expect(measureText('', 'dm-sans', 10, 400)).toBe(0);
  });
});

describe('layoutText', () => {
  it('wraps on spaces', () => {
    expect(layoutText({ ...base, text: 'hello world foo' }).lines).toEqual(['hello', 'world foo']);
  });

  it('keeps text that fits on one line', () => {
    expect(layoutText({ ...base, text: 'short' }).lines).toEqual(['short']);
  });

  it('preserves explicit newlines and counts empty lines', () => {
    expect(layoutText({ ...base, text: 'a\n\nb' }).lines).toEqual(['a', '', 'b']);
    expect(layoutText({ ...base, text: 'a\r\nb' }).lines).toEqual(['a', 'b']);
  });

  it('returns one empty line for empty text', () => {
    const result = layoutText({ ...base, text: '' });
    expect(result.lines).toEqual(['']);
    expect(result.height).toBe(15);
  });

  it('breaks a word longer than the box by character', () => {
    expect(layoutText({ ...base, text: 'abcdefghijklmnopqrstuvwxy' }).lines).toEqual([
      'abcdefghij',
      'klmnopqrst',
      'uvwxy',
    ]);
  });

  it('puts a long word on its own lines after earlier text', () => {
    expect(layoutText({ ...base, text: 'hi abcdefghijklmno' }).lines).toEqual([
      'hi',
      'abcdefghij',
      'klmno',
    ]);
  });

  it('collapses trailing spaces on each line', () => {
    const { lines } = layoutText({ ...base, text: 'hello   \nworld  ' });
    expect(lines).toEqual(['hello', 'world']);
  });

  it('keeps leading and inner double spaces', () => {
    expect(layoutText({ ...base, text: '  a  b' }).lines).toEqual(['  a  b']);
  });

  it('computes height from line count, font size, and line height', () => {
    const result = layoutText({ ...base, text: 'hello world foo' });
    expect(result.lineHeightPx).toBe(15);
    expect(result.height).toBe(30);
  });

  it('limits lines and ends the last one with an ellipsis that still fits', () => {
    const result = layoutText({ ...base, text: 'one two three four five six', maxLines: 2 });
    expect(result.lines).toHaveLength(2);
    const last = result.lines[1] ?? '';
    expect(last.endsWith('…')).toBe(true);
    expect(measureText(last, 'dm-sans', 10, 400)).toBeLessThanOrEqual(50);
  });

  it('does not add an ellipsis when everything fits in maxLines', () => {
    expect(layoutText({ ...base, text: 'a b', maxLines: 2 }).lines).toEqual(['a b']);
  });

  it('caches results by input', () => {
    const first = layoutText({ ...base, text: 'cache me please' });
    expect(layoutText({ ...base, text: 'cache me please' })).toBe(first);
    expect(layoutText({ ...base, text: 'cache me please', maxWidth: 60 })).not.toBe(first);
  });
});

describe('truncateToWidth and fontMetrics', () => {
  it('shortens with an ellipsis only when needed', () => {
    expect(truncateToWidth('hi', 'dm-sans', 10, 400, 50)).toBe('hi');
    const cut = truncateToWidth('hello wonderful world', 'dm-sans', 10, 400, 50);
    expect(cut.endsWith('…')).toBe(true);
    expect(measureText(cut, 'dm-sans', 10, 400)).toBeLessThanOrEqual(50);
  });
  it('reports ascent and descent from the font bounding box', () => {
    expect(fontMetrics('dm-sans', 20, 400)).toEqual({ ascent: 16, descent: 4 });
  });
});
