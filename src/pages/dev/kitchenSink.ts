import { COLORS } from '@/lib/constants';
import { createElement } from '@/lib/elements';
import { normalizeDoc } from '@/lib/normalize';
import type { DocElement, FormDoc, PagePreset } from '@/types/doc';
import { createBlankDoc } from '@/types/doc.schema';

// A 40x30 picture: orange and teal halves, so cover and contain are easy to tell apart.
const SAMPLE_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAeCAYAAABe3VzdAAAAUUlEQVR4Ac3BMQHAIBDAwBAdHVBYSxWIiK8Jhtyt+Z7hon1ebpI4iZM4iZM4iZM4iZM4iZM4iZM4iZM4iZM4iZM4iZM4iZM4iZM4iZM4iZO4H/VRBG5qoIafAAAAAElFTkSuQmCC';

/** Every element type with the awkward options on: rounded corners, opacity, dashes, alignments. */
export function kitchenSink(preset: PagePreset): FormDoc {
  const blank = createBlankDoc(preset);
  const doc: FormDoc = { ...blank, elements: [] };
  const wide = doc.page.width - doc.page.margin * 2;
  const x = doc.page.margin;
  const make = (
    kind: Parameters<typeof createElement>[0],
    patch: Record<string, unknown>,
  ): DocElement => ({ ...createElement(kind, doc), ...patch }) as DocElement;
  let y = x;
  const next = (height: number, gap = 16): number => {
    const top = y;
    y += height + gap;
    return top;
  };
  const elements: DocElement[] = [
    make('rect', { x, y: next(70), width: wide, height: 70, fill: COLORS.mango, radius: 0 }),
    make('rounded-rect', {
      x,
      y: next(70),
      width: wide,
      height: 70,
      fill: COLORS.butter,
      stroke: COLORS.ink,
      strokeWidth: 4,
      radius: 24,
    }),
    make('rounded-rect', {
      x,
      y: next(70),
      width: wide,
      height: 70,
      fill: COLORS.sky,
      stroke: COLORS.ink,
      strokeWidth: 6,
      radius: 16,
      opacity: 0.5,
    }),
    make('ellipse', {
      x,
      y: next(90),
      width: 160,
      height: 90,
      fill: COLORS.leaf,
      stroke: COLORS.ink,
      strokeWidth: 3,
    }),
    make('line', { x, y: next(4), width: wide, thickness: 4, height: 4, color: COLORS.ink }),
    make('line', {
      x,
      y: next(2),
      width: wide,
      thickness: 2,
      height: 2,
      style: 'dashed',
      color: COLORS.berry,
    }),
    make('heading', {
      x,
      y: next(40),
      width: wide,
      text: 'Left aligned heading',
      fontFamily: 'poppins',
      fontSize: 28,
    }),
    make('body', {
      x,
      y: next(40),
      width: wide,
      text: 'Centered body text that is long enough to wrap onto a second line.',
      align: 'center',
      fontFamily: 'lora',
    }),
    make('body', {
      x,
      y: next(40),
      width: wide,
      text: 'Right aligned in Playfair Display',
      align: 'right',
      fontFamily: 'playfair',
      fontWeight: 700,
      color: COLORS.violet,
    }),
    make('body', {
      x,
      y: next(40),
      width: wide,
      text: 'Caveat handwriting, and Space Grotesk below.',
      fontFamily: 'caveat',
      fontSize: 24,
    }),
    make('body', {
      x,
      y: next(24),
      width: wide,
      text: 'Space Grotesk 14px "quotes" & ampersands',
      fontFamily: 'space-grotesk',
      fontSize: 14,
    }),
    {
      ...createElement('rect', doc),
      type: 'image',
      name: 'Image',
      src: SAMPLE_IMAGE,
      alt: '',
      radius: 20,
      opacity: 0.8,
      fit: 'cover',
      x,
      y: next(90),
      width: 160,
      height: 90,
    } as DocElement,
    {
      ...createElement('rect', doc),
      type: 'image',
      name: 'Image',
      src: SAMPLE_IMAGE,
      alt: '',
      radius: 0,
      opacity: 1,
      fit: 'contain',
      x,
      y: next(90),
      width: 160,
      height: 90,
    } as DocElement,
  ];
  for (const kind of [
    'field-text',
    'field-longtext',
    'field-dropdown',
    'field-radio',
    'field-checkbox',
    'field-date',
    'field-signature',
    'field-file',
  ] as const) {
    const base = make(kind, { x, width: Math.min(wide, 350) });
    const options = base.type === 'field' && base.options.length ? ['One', 'Two', 'Three'] : [];
    // Normalizing first gives option lists their real height before the next element is placed.
    const el = normalizeDoc({ ...doc, elements: [{ ...base, options } as DocElement] }).elements[0];
    if (el)
      elements.push({
        ...el,
        y: next(el.height, 20),
        ...(el.type === 'field' ? { required: kind === 'field-text' } : {}),
      });
  }
  return normalizeDoc({ ...doc, elements });
}
