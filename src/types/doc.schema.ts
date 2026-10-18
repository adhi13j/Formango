import { z } from 'zod';
import {
  COLORS,
  MAX_ELEMENTS,
  MAX_FILE_MB,
  MAX_GROUP_COLUMNS,
  MAX_GROUP_ROWS,
  MAX_IMAGE_BYTES,
  MAX_LABEL_LENGTH,
  MAX_OPTIONS,
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  PRESETS,
} from '@/lib/constants';
import { FONT_IDS } from '@/lib/fonts';
import { ensureSubmitButton } from '@/lib/submitButton';
import type { FormDoc, PagePreset } from '@/types/doc';

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Expected a #RRGGBB color')
  .transform((value) => value.toUpperCase());

const fontId = z.enum(FONT_IDS);
const weight = z.union([z.literal(400), z.literal(700)]);
const coordinate = z.number().min(-100_000).max(100_000).transform(Math.round);
const size = z.number().min(0).max(100_000).transform(Math.round);

/** Image sources: our own image data URLs only (Storage URLs are allowed from Phase 3). */
const imageSrc = z
  .string()
  .max(MAX_IMAGE_BYTES * 1.4)
  .refine(
    (value) =>
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ||
      value.startsWith('https://'),
    'Images must be PNG, JPEG, or WebP',
  );

const base = {
  id: z.string().min(1).max(40),
  name: z.string().max(MAX_LABEL_LENGTH),
  x: coordinate,
  y: coordinate,
  width: size,
  height: size,
  locked: z.boolean(),
  hidden: z.boolean(),
};

const textElement = z.object({
  ...base,
  type: z.literal('text'),
  text: z.string().max(MAX_TEXT_LENGTH),
  role: z.enum(['heading', 'body']),
  fontFamily: fontId,
  fontSize: z.number().min(8).max(120),
  fontWeight: weight,
  color: hexColor,
  align: z.enum(['left', 'center', 'right']),
  lineHeight: z.number().min(1).max(2),
  autoHeight: z.boolean(),
});

const shapeElement = z.object({
  ...base,
  type: z.literal('shape'),
  shape: z.enum(['rect', 'ellipse']),
  fill: hexColor.nullable(),
  stroke: hexColor.nullable(),
  strokeWidth: z.number().min(0).max(20),
  radius: z.number().min(0).max(200),
  opacity: z.number().min(0).max(1),
});

const lineElement = z.object({
  ...base,
  type: z.literal('line'),
  color: hexColor,
  thickness: z.number().min(1).max(20),
  style: z.enum(['solid', 'dashed']),
});

const imageElement = z.object({
  ...base,
  type: z.literal('image'),
  src: imageSrc,
  alt: z.string().max(300),
  radius: z.number().min(0).max(200),
  opacity: z.number().min(0).max(1),
  fit: z.enum(['cover', 'contain']),
});

const fieldElement = z.object({
  ...base,
  type: z.literal('field'),
  fieldType: z.enum([
    'text',
    'longtext',
    'dropdown',
    'checkbox',
    'radio',
    'date',
    'signature',
    'file',
    'group',
  ]),
  key: z.string().min(1).max(60),
  label: z.string().max(MAX_LABEL_LENGTH),
  placeholder: z.string().max(MAX_LABEL_LENGTH),
  required: z.boolean(),
  validation: z.enum(['none', 'email', 'phone', 'number']),
  options: z.array(z.string().min(1).max(MAX_LABEL_LENGTH)).max(MAX_OPTIONS),
  fileKinds: z.array(z.enum(['image', 'pdf', 'document', 'spreadsheet'])).max(4),
  maxFileMb: z.number().int().min(1).max(MAX_FILE_MB),
  columns: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        label: z.string().max(MAX_LABEL_LENGTH),
        type: z.enum(['text', 'number', 'date', 'dropdown', 'radio']),
        required: z.boolean(),
        options: z.array(z.string().min(1).max(MAX_LABEL_LENGTH)).max(MAX_OPTIONS),
      }),
    )
    .max(MAX_GROUP_COLUMNS),
  itemLabel: z.string().max(40),
  addLabel: z.string().max(40),
  minRows: z.number().int().min(0).max(MAX_GROUP_ROWS),
  maxRows: z.number().int().min(1).max(MAX_GROUP_ROWS),
  perRow: z.union([z.literal(1), z.literal(2)]),
  labelStyle: z.object({
    fontFamily: fontId,
    fontSize: z.number().min(8).max(120),
    fontWeight: weight,
    color: hexColor,
  }),
  inputStyle: z.object({
    fontFamily: fontId,
    fontSize: z.number().min(8).max(120),
    textColor: hexColor,
    fill: hexColor,
    stroke: hexColor,
    strokeWidth: z.number().min(0).max(20),
    radius: z.number().min(0).max(200),
  }),
});

const buttonElement = z.object({
  ...base,
  type: z.literal('button'),
  label: z.string().min(1).max(30),
  fontFamily: fontId,
  fontSize: z.number().min(8).max(120),
  fontWeight: weight,
  textColor: hexColor,
  fill: hexColor,
  radius: z.number().min(0).max(200),
});

const element = z.discriminatedUnion('type', [
  textElement,
  shapeElement,
  lineElement,
  imageElement,
  fieldElement,
  buttonElement,
]);

const pageSettings = z.object({
  preset: z.enum(['mobile', 'a4']),
  width: z.number().int().min(100).max(2000),
  height: z.number().int().min(100).max(20_000),
  autoHeight: z.boolean(),
  background: hexColor,
  outerBackground: hexColor,
  margin: z.number().int().min(0).max(200),
});

export const formDocSchema = z
  .object({
    version: z.literal(1),
    title: z.string().min(1).max(MAX_TITLE_LENGTH),
    page: pageSettings,
    elements: z.array(element).max(MAX_ELEMENTS),
  })
  .superRefine((doc, ctx) => {
    const seen = new Set<string>();
    doc.elements.forEach((el, index) => {
      if (seen.has(el.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['elements', index, 'id'],
          message: `Duplicate element id "${el.id}"`,
        });
      }
      seen.add(el.id);
    });
  }) satisfies z.ZodType<FormDoc>;

export const CURRENT_DOC_VERSION = 1;

/**
 * Upgrades an older document step by step. Version 1 is the only version so far, so this only
 * rejects unknown versions. When the shape changes: bump `version`, add a case that returns the
 * next version's shape, and keep the older cases.
 */
export function migrate(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('version' in raw)) return raw;
  switch (raw.version) {
    case 1:
      return raw;
    default:
      throw new Error(`Unsupported document version: ${String(raw.version)}`);
  }
}

/**
 * Older drafts kept the submit button's look in `page.submit` and had no button element, and
 * file fields did not exist. Fill in what the schema now requires before validating.
 */
const GROUP_DEFAULTS = {
  columns: [],
  itemLabel: 'Item',
  addLabel: 'Add item',
  minRows: 0,
  maxRows: 10,
  perRow: 1,
};

function withSubmitButton(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('elements' in raw)) return raw;
  if (!Array.isArray(raw.elements)) return raw;
  const elements: unknown[] = raw.elements.map((el: unknown) => {
    if (typeof el !== 'object' || el === null || !('type' in el) || el.type !== 'field') return el;
    return { fileKinds: [], maxFileMb: 5, ...GROUP_DEFAULTS, ...el };
  });
  return { ...raw, elements };
}

export type ParseDocResult = { ok: true; doc: FormDoc } | { ok: false; errors: string[] };

function describeIssue(issue: z.core.$ZodIssue): string {
  const path = issue.path.map(String).join('.');
  return path ? `${path}: ${issue.message}` : issue.message;
}

/** Migrates, then validates. Never throws. Use for imports, local storage, and Supabase rows. */
export function parseDoc(raw: unknown): ParseDocResult {
  let migrated: unknown;
  try {
    migrated = migrate(raw);
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : 'Unknown version'] };
  }
  const result = formDocSchema.safeParse(withSubmitButton(migrated));
  if (result.success) return { ok: true, doc: ensureSubmitButton(result.data) };
  return { ok: false, errors: result.error.issues.slice(0, 5).map(describeIssue) };
}

export function createBlankDoc(preset: PagePreset = 'mobile'): FormDoc {
  const info = PRESETS[preset];
  return ensureSubmitButton({
    version: CURRENT_DOC_VERSION,
    title: 'Untitled form',
    page: {
      preset,
      width: info.width,
      height: info.height,
      autoHeight: info.autoHeight,
      background: COLORS.white,
      outerBackground: COLORS.cream,
      margin: info.margin,
    },
    elements: [],
  });
}
