import { AUTO_HEIGHT_PADDING, COLORS, DEFAULT_FONT } from '@/lib/constants';
import { newElementId } from '@/lib/elements';
import type { ButtonElement, DocElement, FormDoc, PageSettings } from '@/types/doc';

export const SUBMIT_HEIGHT = 48;
export const SUBMIT_GAP = 24;

export function isButton(el: DocElement): el is ButtonElement {
  return el.type === 'button';
}

/** True when the page holds anything besides the submit button every form starts with. */
export function hasContent(doc: Pick<FormDoc, 'elements'>): boolean {
  return doc.elements.some((el) => el.type !== 'button');
}

/** The submit button of a form, or undefined for a document that has not been normalized yet. */
export function findSubmitButton(doc: Pick<FormDoc, 'elements'>): ButtonElement | undefined {
  return doc.elements.find(isButton);
}

/**
 * Where a new submit button goes: at the bottom of the page, or below the lowest element when the
 * content already reaches that far (mobile pages grow).
 */
function defaultY(doc: Pick<FormDoc, 'page' | 'elements'>): number {
  const { page } = doc;
  if (!page.autoHeight) return Math.max(0, page.height - page.margin - SUBMIT_HEIGHT);
  // Mobile pages end AUTO_HEIGHT_PADDING below their lowest element, so the button keeps that room.
  const bottom = page.height - AUTO_HEIGHT_PADDING - SUBMIT_HEIGHT;
  const lowest = doc.elements.reduce((max, el) => Math.max(max, el.y + el.height), 0);
  return lowest === 0 ? bottom : Math.max(bottom, lowest + SUBMIT_GAP);
}

export function createSubmitButton(doc: Pick<FormDoc, 'page' | 'elements'>): ButtonElement {
  const page: PageSettings = doc.page;
  return {
    id: newElementId(),
    type: 'button',
    name: 'Submit button',
    x: page.margin,
    y: defaultY(doc),
    width: page.width - page.margin * 2,
    height: SUBMIT_HEIGHT,
    locked: false,
    hidden: false,
    label: 'Submit',
    fontFamily: DEFAULT_FONT,
    fontSize: 16,
    fontWeight: 700,
    textColor: COLORS.ink,
    fill: COLORS.mango,
    radius: 12,
  };
}

/**
 * Every form has exactly one submit button. Adds it when missing and drops extra copies (from an
 * old import or a hand-edited file). Returns the same document when it is already right.
 */
export function ensureSubmitButton(doc: FormDoc): FormDoc {
  const buttons = doc.elements.filter(isButton);
  if (buttons.length === 0) {
    return { ...doc, elements: [...doc.elements, createSubmitButton(doc)] };
  }
  if (buttons.length === 1) return doc;
  const keep = buttons[0];
  return { ...doc, elements: doc.elements.filter((el) => !isButton(el) || el === keep) };
}
