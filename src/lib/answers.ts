import { cellField, isRowEmpty, parseRows, stringifyRows } from '@/lib/groups';
import type { AnswerValue } from '@/components/elements/types';
import { byReadingOrder } from '@/lib/geometry';
import type { Answers, FieldElement, FormDoc } from '@/types/doc';

export const MAX_SHORT_ANSWER = 200;
export const MAX_LONG_ANSWER = 2000;
export const MAX_SIGNATURE_CHARS = 120_000;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_CHARS = /^[+\d\s\-()]+$/;
const NUMBER = /^-?\d+([.,]\d+)?$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const SIGNATURE_URL = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;

type Value = AnswerValue | undefined;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isEmptyAnswer(value: AnswerValue | undefined): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  return value.trim() === '';
}

function isRealDate(iso: string): boolean {
  const match = ISO_DATE.exec(iso);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** `2026-03-14` becomes `14 Mar 2026`. Anything that is not a real ISO date is returned unchanged. */
export function formatDate(iso: string): string {
  const match = ISO_DATE.exec(iso);
  if (!match || !isRealDate(iso)) return iso;
  return `${match[3]} ${MONTHS[Number(match[2]) - 1] ?? ''} ${match[1]}`;
}

function requiredMessage(field: FieldElement): string {
  switch (field.fieldType) {
    case 'checkbox':
      return 'Pick at least one option';
    case 'radio':
    case 'dropdown':
      return 'Pick an option';
    case 'signature':
      return 'Please sign here';
    case 'file':
      return 'Upload a file';
    case 'date':
      return 'Choose a date';
    default:
      return 'This field is required';
  }
}

function invalidText(field: FieldElement, text: string): string | null {
  const max = field.fieldType === 'longtext' ? MAX_LONG_ANSWER : MAX_SHORT_ANSWER;
  if (text.length > max) return `Use at most ${max} characters`;
  if (field.fieldType !== 'text') return null;
  switch (field.validation) {
    case 'email':
      return EMAIL.test(text) ? null : 'Enter a valid email';
    case 'phone': {
      const digits = text.replace(/\D/g, '');
      return PHONE_CHARS.test(text) && digits.length >= 7 && digits.length <= 15
        ? null
        : 'Enter a valid phone number';
    }
    case 'number':
      return NUMBER.test(text) ? null : 'Enter a number';
    case 'none':
      return null;
    default: {
      const unreachable: never = field.validation;
      return unreachable;
    }
  }
}

/** The error message for one field, or null when the answer is fine. Hidden fields never fail. */
export function validateField(field: FieldElement, value: AnswerValue | undefined): string | null {
  if (field.hidden) return null;
  if (isEmptyAnswer(value)) return field.required ? requiredMessage(field) : null;
  switch (field.fieldType) {
    case 'text':
    case 'longtext': {
      return typeof value === 'string' ? invalidText(field, value.trim()) : 'Enter text';
    }
    case 'dropdown':
    case 'radio':
      return typeof value === 'string' && field.options.includes(value)
        ? null
        : 'Pick one of the options';
    case 'checkbox':
      return Array.isArray(value) && value.every((option) => field.options.includes(option))
        ? null
        : 'Pick from the options';
    case 'date':
      return typeof value === 'string' && isRealDate(value) ? null : 'Enter a valid date';
    case 'signature':
      return typeof value === 'string' &&
        value.length <= MAX_SIGNATURE_CHARS &&
        SIGNATURE_URL.test(value)
        ? null
        : 'Please sign again';
    case 'file':
      // The type and size were checked when the file was picked (lib/fileTypes.ts).
      return typeof value === 'string' ? null : 'Upload a file';
    case 'group':
      return groupLevelError(field, value);
    default: {
      const unreachable: never = field.fieldType;
      return unreachable;
    }
  }
}

function groupLevelError(field: FieldElement, value: Value): string | null {
  const filled = parseRows(typeof value === 'string' ? value : undefined).filter(
    (row) => !isRowEmpty(row),
  ).length;
  const needed = Math.max(field.minRows, field.required ? 1 : 0);
  if (filled >= needed) return null;
  return needed === 1
    ? `Add at least one ${field.itemLabel.toLowerCase()}`
    : `Add at least ${needed} ${field.itemLabel.toLowerCase()} entries`;
}

/**
 * Every error for one field. Most fields have at most one, under their own id. A repeating group
 * can also have errors in single cells, keyed `groupId.row.columnId`.
 */
export function validateFieldAll(field: FieldElement, value: Value): Record<string, string> {
  if (field.fieldType !== 'group') {
    const message = validateField(field, value);
    return message ? { [field.id]: message } : {};
  }
  const errors: Record<string, string> = {};
  if (field.hidden) return errors;
  const whole = groupLevelError(field, value);
  if (whole) errors[field.id] = whole;
  const rows = parseRows(typeof value === 'string' ? value : undefined);
  rows.forEach((row, rowIndex) => {
    for (const column of field.columns) {
      const cell = cellField(field, rowIndex, { column, x: 0, y: 0, width: 1, height: 1 });
      const message = validateField(cell, row[column.id]);
      if (message) errors[cell.id] = message;
    }
  });
  return errors;
}

/** Errors keyed by element id (or cell id inside groups), for every visible field that fails. */
export function validateAnswers(
  doc: Pick<FormDoc, 'elements'>,
  answers: Record<string, AnswerValue>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const el of doc.elements) {
    if (el.type !== 'field') continue;
    Object.assign(errors, validateFieldAll(el, answers[el.id]));
  }
  return errors;
}

/** Field ids that have errors, in the order a person reads the page (top to bottom, then left to right). */
export function errorOrder(
  doc: Pick<FormDoc, 'elements'>,
  errors: Record<string, string>,
): string[] {
  return doc.elements
    .filter(
      (el) =>
        el.type === 'field' &&
        Object.keys(errors).some((key) => key === el.id || key.startsWith(`${el.id}.`)),
    )
    .sort(byReadingOrder)
    .map((el) => el.id);
}

/**
 * What gets stored on submit: trimmed text, no empty answers, and nothing for fields that are
 * hidden or no longer exist.
 */
export function cleanAnswers(
  doc: Pick<FormDoc, 'elements'>,
  answers: Record<string, AnswerValue>,
): Answers {
  const clean: Answers = {};
  for (const el of doc.elements) {
    if (el.type !== 'field' || el.hidden) continue;
    const value = answers[el.id];
    if (isEmptyAnswer(value) || value === undefined) continue;
    if (el.fieldType === 'group') {
      const rows = parseRows(typeof value === 'string' ? value : undefined)
        .filter((row) => !isRowEmpty(row))
        .map((row) =>
          Object.fromEntries(
            Object.entries(row)
              .map(([key, cell]) => [key, cell.trim()] as const)
              .filter(([, cell]) => cell !== ''),
          ),
        );
      if (rows.length > 0) clean[el.id] = stringifyRows(rows);
      continue;
    }
    clean[el.id] = typeof value === 'string' ? value.trim() : value;
  }
  return clean;
}
