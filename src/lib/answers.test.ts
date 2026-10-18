import { describe, expect, it } from 'vitest';
import { createElement } from '@/lib/elements';
import type { FieldElement, FormDoc } from '@/types/doc';
import { createBlankDoc } from '@/types/doc.schema';
import {
  cleanAnswers,
  errorOrder,
  formatDate,
  isEmptyAnswer,
  validateAnswers,
  validateField,
} from './answers';

const doc = createBlankDoc('mobile');
const make = (kind: Parameters<typeof createElement>[0], patch: Partial<FieldElement> = {}) =>
  ({ ...createElement(kind, doc), ...patch }) as FieldElement;

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('isEmptyAnswer', () => {
  it('treats undefined, blank text, and empty lists as empty', () => {
    expect(isEmptyAnswer(undefined)).toBe(true);
    expect(isEmptyAnswer('   ')).toBe(true);
    expect(isEmptyAnswer([])).toBe(true);
    expect(isEmptyAnswer('a')).toBe(false);
    expect(isEmptyAnswer(['a'])).toBe(false);
  });
});

describe('required', () => {
  it.each([
    ['field-text', 'This field is required'],
    ['field-longtext', 'This field is required'],
    ['field-dropdown', 'Pick an option'],
    ['field-radio', 'Pick an option'],
    ['field-checkbox', 'Pick at least one option'],
    ['field-date', 'Choose a date'],
    ['field-signature', 'Please sign here'],
    ['field-file', 'Upload a file'],
  ] as const)('%s asks for an answer when required', (kind, message) => {
    expect(validateField(make(kind, { required: true }), undefined)).toBe(message);
    expect(validateField(make(kind), undefined)).toBeNull();
  });

  it('counts whitespace as empty', () => {
    expect(validateField(make('field-text', { required: true }), '   ')).toBe(
      'This field is required',
    );
  });
});

describe('text rules', () => {
  const text = (validation: FieldElement['validation']) => make('field-text', { validation });
  it('checks email', () => {
    expect(validateField(text('email'), 'a@b.co')).toBeNull();
    expect(validateField(text('email'), 'a@b')).toBe('Enter a valid email');
    expect(validateField(text('email'), 'no spaces@b.com')).toBe('Enter a valid email');
  });
  it('checks phone numbers: 7 to 15 digits, with + - ( ) and spaces allowed', () => {
    expect(validateField(text('phone'), '+1 (555) 123-4567')).toBeNull();
    expect(validateField(text('phone'), '12345')).toBe('Enter a valid phone number');
    expect(validateField(text('phone'), '555-abc-1234')).toBe('Enter a valid phone number');
    expect(validateField(text('phone'), '1'.repeat(16))).toBe('Enter a valid phone number');
  });
  it('checks numbers, allowing a decimal comma', () => {
    expect(validateField(text('number'), '-12.5')).toBeNull();
    expect(validateField(text('number'), '12,5')).toBeNull();
    expect(validateField(text('number'), '12a')).toBe('Enter a number');
  });
  it('limits length: 200 for short text, 2000 for long text', () => {
    expect(validateField(make('field-text'), 'x'.repeat(200))).toBeNull();
    expect(validateField(make('field-text'), 'x'.repeat(201))).toBe('Use at most 200 characters');
    expect(validateField(make('field-longtext'), 'x'.repeat(2000))).toBeNull();
    expect(validateField(make('field-longtext'), 'x'.repeat(2001))).toBe(
      'Use at most 2000 characters',
    );
  });
  it('trims before validating', () => {
    expect(validateField(make('field-text', { validation: 'email' }), '  a@b.co  ')).toBeNull();
  });
});

describe('choices, dates, signatures, files', () => {
  it('requires dropdown and radio answers to be one of the options', () => {
    const radio = make('field-radio', { options: ['A', 'B'] });
    expect(validateField(radio, 'A')).toBeNull();
    expect(validateField(radio, 'C')).toBe('Pick one of the options');
  });
  it('requires every checkbox answer to be an option', () => {
    const boxes = make('field-checkbox', { options: ['A', 'B'] });
    expect(validateField(boxes, ['A', 'B'])).toBeNull();
    expect(validateField(boxes, ['A', 'Z'])).toBe('Pick from the options');
  });
  it('accepts real ISO dates only', () => {
    const date = make('field-date');
    expect(validateField(date, '2026-03-14')).toBeNull();
    expect(validateField(date, '2026-02-30')).toBe('Enter a valid date');
    expect(validateField(date, '14/03/2026')).toBe('Enter a valid date');
  });
  it('accepts a PNG data URL as a signature and nothing else', () => {
    const sig = make('field-signature');
    expect(validateField(sig, PNG)).toBeNull();
    expect(validateField(sig, 'data:image/jpeg;base64,AAAA')).toBe('Please sign again');
    expect(validateField(sig, 'Asha')).toBe('Please sign again');
  });
  it('accepts a file name for file fields', () => {
    expect(validateField(make('field-file', { required: true }), 'cv.pdf')).toBeNull();
  });
});

describe('validateAnswers', () => {
  it('skips hidden fields and non-fields, and returns messages by id', () => {
    const a = make('field-text', { required: true, id: 'a' });
    const hidden = make('field-text', { required: true, id: 'h', hidden: true });
    const heading = { ...createElement('heading', doc), id: 't' };
    const form: FormDoc = { ...doc, elements: [a, hidden, heading] };
    expect(validateAnswers(form, {})).toEqual({ a: 'This field is required' });
    expect(validateAnswers(form, { a: 'Asha' })).toEqual({});
  });

  it('lists error ids in reading order', () => {
    const low = make('field-text', { id: 'low', y: 300, x: 20 });
    const right = make('field-text', { id: 'right', y: 100, x: 200 });
    const left = make('field-text', { id: 'left', y: 100, x: 20 });
    const form: FormDoc = { ...doc, elements: [low, right, left] };
    const errors = { low: 'x', right: 'x', left: 'x' };
    expect(errorOrder(form, errors)).toEqual(['left', 'right', 'low']);
  });
});

describe('cleanAnswers', () => {
  it('trims text, drops empty answers, hidden fields, and unknown ids', () => {
    const a = make('field-text', { id: 'a' });
    const b = make('field-text', { id: 'b' });
    const hidden = make('field-text', { id: 'h', hidden: true });
    const form: FormDoc = { ...doc, elements: [a, b, hidden] };
    expect(cleanAnswers(form, { a: '  Asha ', b: '  ', h: 'secret', gone: 'x' })).toEqual({
      a: 'Asha',
    });
  });
});

describe('formatDate', () => {
  it('formats as DD MMM YYYY with a two-digit day', () => {
    expect(formatDate('2026-03-04')).toBe('04 Mar 2026');
    expect(formatDate('2026-12-31')).toBe('31 Dec 2026');
  });
  it('returns anything else unchanged', () => {
    expect(formatDate('soon')).toBe('soon');
    expect(formatDate('2026-02-30')).toBe('2026-02-30');
  });
});
