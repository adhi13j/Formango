import { nanoid } from 'nanoid';
import { COLORS, DEFAULT_FONT, PRESETS } from '@/lib/constants';
import { optionListHeight } from '@/lib/fields';
import { slugify, uniqueSlug } from '@/lib/slug';
import type {
  DocElement,
  FieldElement,
  FieldType,
  FormDoc,
  ImageElement,
  LineElement,
  PageSettings,
  ShapeElement,
  TextElement,
} from '@/types/doc';

export type NewElementKind =
  | 'heading'
  | 'subheading'
  | 'body'
  | 'rect'
  | 'rounded-rect'
  | 'ellipse'
  | 'line'
  | 'divider'
  | `field-${FieldType}`;

export const ELEMENT_ID_LENGTH = 10;
export const newElementId = (): string => nanoid(ELEMENT_ID_LENGTH);

/** Width of the content area inside the page margins (350 on mobile, 714 on A4). */
export function contentWidth(page: Pick<PageSettings, 'width' | 'margin'>): number {
  return page.width - page.margin * 2;
}

const FIELD_LABELS: Record<FieldType, { label: string; name: string }> = {
  text: { label: 'Short answer', name: 'Short text' },
  longtext: { label: 'Long answer', name: 'Long text' },
  dropdown: { label: 'Dropdown', name: 'Dropdown' },
  checkbox: { label: 'Checkboxes', name: 'Checkbox' },
  radio: { label: 'Single choice', name: 'Radio' },
  date: { label: 'Date', name: 'Date' },
  signature: { label: 'Signature', name: 'Signature' },
};

export const FIELD_TYPES = Object.keys(FIELD_LABELS) as FieldType[];

export function fieldDisplayName(fieldType: FieldType): string {
  return FIELD_LABELS[fieldType].name;
}

function baseOf(page: PageSettings, name: string, height: number, width = contentWidth(page)) {
  return {
    id: newElementId(),
    name,
    x: page.margin,
    y: page.margin,
    width,
    height,
    locked: false,
    hidden: false,
  };
}

function textElement(
  page: PageSettings,
  name: string,
  role: TextElement['role'],
  text: string,
  fontSize: number,
  fontWeight: TextElement['fontWeight'],
): TextElement {
  return {
    ...baseOf(page, name, Math.round(fontSize * 1.3)),
    type: 'text',
    text,
    role,
    fontFamily: DEFAULT_FONT,
    fontSize,
    fontWeight,
    color: COLORS.ink,
    align: 'left',
    lineHeight: 1.3,
    autoHeight: true,
  };
}

function fieldElement(
  page: PageSettings,
  doc: Pick<FormDoc, 'elements'>,
  fieldType: FieldType,
): FieldElement {
  const { label, name } = FIELD_LABELS[fieldType];
  const options =
    fieldType === 'dropdown' || fieldType === 'radio' || fieldType === 'checkbox'
      ? ['Option 1', 'Option 2']
      : [];
  const fullWidth =
    fieldType === 'longtext' ? contentWidth(page) : Math.min(350, contentWidth(page));
  const height =
    fieldType === 'longtext' || fieldType === 'signature'
      ? 140
      : fieldType === 'radio' || fieldType === 'checkbox'
        ? optionListHeight(14, options.length)
        : 72;
  const taken = new Set(doc.elements.flatMap((el) => (el.type === 'field' ? [el.key] : [])));
  return {
    ...baseOf(page, name, height, fullWidth),
    type: 'field',
    fieldType,
    key: uniqueSlug(slugify(label, 'field'), taken),
    label,
    placeholder: '',
    required: false,
    validation: 'none',
    options,
    labelStyle: { fontFamily: DEFAULT_FONT, fontSize: 14, fontWeight: 700, color: COLORS.ink },
    inputStyle: {
      fontFamily: DEFAULT_FONT,
      fontSize: 16,
      textColor: COLORS.ink,
      fill: COLORS.white,
      stroke: COLORS.inkBorder,
      strokeWidth: 1,
      radius: 8,
    },
  };
}

function shapeElement(
  page: PageSettings,
  shape: ShapeElement['shape'],
  radius: number,
): ShapeElement {
  const isEllipse = shape === 'ellipse';
  return {
    ...baseOf(
      page,
      isEllipse ? 'Circle' : radius > 0 ? 'Rounded rectangle' : 'Rectangle',
      isEllipse ? 160 : 120,
      isEllipse ? 160 : undefined,
    ),
    type: 'shape',
    shape,
    fill: COLORS.cream,
    stroke: null,
    strokeWidth: 0,
    radius,
    opacity: 1,
  };
}

function lineElement(page: PageSettings): LineElement {
  return {
    ...baseOf(page, 'Line', 2),
    type: 'line',
    color: COLORS.inkDivider,
    thickness: 2,
    style: 'solid',
  };
}

/** Builds a new element with the defaults from docs/schema.md, placed at the page margin. */
export function createElement(
  kind: NewElementKind,
  doc: Pick<FormDoc, 'page' | 'elements'>,
): DocElement {
  const { page } = doc;
  switch (kind) {
    case 'heading':
      return textElement(page, 'Heading', 'heading', 'Add a heading', 28, 700);
    case 'subheading':
      return textElement(page, 'Subheading', 'heading', 'Add a subheading', 20, 700);
    case 'body':
      return textElement(page, 'Body text', 'body', 'Add some body text here', 16, 400);
    case 'rect':
      return shapeElement(page, 'rect', 0);
    case 'rounded-rect':
      return shapeElement(page, 'rect', 16);
    case 'ellipse':
      return shapeElement(page, 'ellipse', 0);
    case 'line':
      return lineElement(page);
    case 'divider':
      return { ...lineElement(page), name: 'Divider', thickness: 1, height: 1 };
    default:
      return fieldElement(page, doc, kind.slice('field-'.length) as FieldType);
  }
}

/** Builds an image element that keeps the picture's ratio and fits the content width. */
export function createImageElement(
  page: PageSettings,
  src: string,
  naturalWidth: number,
  naturalHeight: number,
  alt = '',
): ImageElement {
  const width = Math.min(contentWidth(page), naturalWidth);
  const height = Math.max(1, Math.round((width * naturalHeight) / Math.max(1, naturalWidth)));
  return {
    ...baseOf(page, 'Image', height, width),
    type: 'image',
    src,
    alt,
    radius: 0,
    opacity: 1,
    fit: 'cover',
  };
}

export function pageForPreset(preset: PageSettings['preset'], current: PageSettings): PageSettings {
  const info = PRESETS[preset];
  return {
    ...current,
    preset,
    width: info.width,
    height: info.height,
    autoHeight: info.autoHeight,
    margin: info.margin,
  };
}
