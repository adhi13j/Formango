import {
  MAX_ELEMENTS,
  MIN_IMAGE_SIZE,
  MIN_LINE_WIDTH,
  MIN_SHAPE_SIZE,
  MIN_TEXT_WIDTH,
  MIN_WIDTH,
} from '@/lib/constants';
import { isOptionList, minFieldHeight, optionListHeight } from '@/lib/fields';
import { clampToPage } from '@/lib/geometry';
import { layoutText } from '@/lib/text/layoutText';
import type { DocElement, FormDoc, PageSettings, TextElement } from '@/types/doc';

export function shallowEqual(a: object, b: object): boolean {
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  return keys.every((key) => Object.is(left[key], right[key]));
}

/** Height a text element needs for its content at its current width. */
export function textContentHeight(
  el: Pick<TextElement, 'text' | 'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'width'>,
): number {
  return Math.ceil(
    layoutText({
      text: el.text,
      fontFamily: el.fontFamily,
      fontSize: el.fontSize,
      fontWeight: el.fontWeight,
      maxWidth: el.width,
      lineHeight: el.lineHeight,
    }).height,
  );
}

function enforceSizes(el: DocElement): DocElement {
  switch (el.type) {
    case 'text': {
      const width = Math.max(MIN_TEXT_WIDTH, el.width);
      const measured = { ...el, width };
      const height = el.autoHeight
        ? textContentHeight(measured)
        : Math.max(Math.ceil(el.fontSize * el.lineHeight), el.height);
      return { ...el, width, height };
    }
    case 'shape':
      return {
        ...el,
        width: Math.max(MIN_SHAPE_SIZE, el.width),
        height: Math.max(MIN_SHAPE_SIZE, el.height),
      };
    case 'image':
      return {
        ...el,
        width: Math.max(MIN_IMAGE_SIZE, el.width),
        height: Math.max(MIN_IMAGE_SIZE, el.height),
      };
    case 'line':
      return { ...el, width: Math.max(MIN_LINE_WIDTH, el.width), height: Math.round(el.thickness) };
    case 'field': {
      const options =
        el.options.length === 0 && (el.fieldType === 'dropdown' || isOptionList(el.fieldType))
          ? ['Option 1']
          : el.options;
      const withOptions = options === el.options ? el : { ...el, options };
      const width = Math.max(MIN_WIDTH, withOptions.width);
      const height = isOptionList(withOptions.fieldType)
        ? optionListHeight(withOptions.labelStyle.fontSize, withOptions.options.length)
        : Math.max(minFieldHeight(withOptions), withOptions.height);
      return { ...withOptions, width, height };
    }
    default: {
      const unreachable: never = el;
      return unreachable;
    }
  }
}

/**
 * Enforces every invariant on one element: integer geometry, minimum sizes, auto heights, option
 * list heights, and staying on the page. Returns the same object when nothing needed to change so
 * memoized views do not re-render.
 */
export function normalizeElement(el: DocElement, page: PageSettings): DocElement {
  const sized = enforceSizes({
    ...el,
    x: Math.round(el.x),
    y: Math.round(el.y),
    width: Math.round(el.width),
    height: Math.round(el.height),
  });
  const clamped = clampToPage(sized, page, page.height);
  const next = { ...sized, ...clamped } as DocElement;
  return shallowEqual(el, next) ? el : next;
}

/** Smallest size an element may be resized to. */
export function minSizeOf(el: DocElement): { width: number; height: number } {
  switch (el.type) {
    case 'text':
      return { width: MIN_TEXT_WIDTH, height: Math.ceil(el.fontSize * el.lineHeight) };
    case 'shape':
      return { width: MIN_SHAPE_SIZE, height: MIN_SHAPE_SIZE };
    case 'image':
      return { width: MIN_IMAGE_SIZE, height: MIN_IMAGE_SIZE };
    case 'line':
      return { width: MIN_LINE_WIDTH, height: el.thickness };
    case 'field':
      return { width: MIN_WIDTH, height: minFieldHeight(el) };
    default: {
      const unreachable: never = el;
      return unreachable;
    }
  }
}

/** Normalizes every element and caps the count. Returns the same doc when nothing changed. */
export function normalizeDoc(doc: FormDoc): FormDoc {
  let changed = false;
  const source =
    doc.elements.length > MAX_ELEMENTS ? doc.elements.slice(0, MAX_ELEMENTS) : doc.elements;
  if (source !== doc.elements) changed = true;
  const elements = source.map((el) => {
    const next = normalizeElement(el, doc.page);
    if (next !== el) changed = true;
    return next;
  });
  return changed ? { ...doc, elements } : doc;
}
