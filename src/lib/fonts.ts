import type { DocElement } from '@/types/doc';

export const FONT_IDS = [
  'dm-sans',
  'inter',
  'poppins',
  'playfair',
  'lora',
  'space-grotesk',
  'caveat',
] as const;

export type FontId = (typeof FONT_IDS)[number];
export type FontWeight = 400 | 700;

interface FontFiles {
  woff2: string;
  ttf: string;
}

interface FontInfo {
  label: string;
  /** CSS font-family name, as declared in styles/fonts.css */
  family: string;
  files: Record<FontWeight, FontFiles>;
}

function files(id: FontId): Record<FontWeight, FontFiles> {
  return {
    400: { woff2: `/fonts/${id}-400.woff2`, ttf: `/fonts/ttf/${id}-400.ttf` },
    700: { woff2: `/fonts/${id}-700.woff2`, ttf: `/fonts/ttf/${id}-700.ttf` },
  };
}

export const FONTS: Record<FontId, FontInfo> = {
  'dm-sans': { label: 'DM Sans', family: 'DM Sans', files: files('dm-sans') },
  inter: { label: 'Inter', family: 'Inter', files: files('inter') },
  poppins: { label: 'Poppins', family: 'Poppins', files: files('poppins') },
  playfair: { label: 'Playfair Display', family: 'Playfair Display', files: files('playfair') },
  lora: { label: 'Lora', family: 'Lora', files: files('lora') },
  'space-grotesk': {
    label: 'Space Grotesk',
    family: 'Space Grotesk',
    files: files('space-grotesk'),
  },
  caveat: { label: 'Caveat', family: 'Caveat', files: files('caveat') },
};

export const FONT_LOAD_TIMEOUT_MS = 4000;

/** CSS font shorthand used for canvas measurement and for loading, e.g. `700 28px "Poppins"`. */
export function fontString(id: FontId, weight: FontWeight, sizePx: number): string {
  return `${weight} ${sizePx}px "${FONTS[id].family}"`;
}

/**
 * Loads the given fonts (both weights) and resolves when they are ready or after the timeout.
 * Never rejects: missing fonts fall back to the system font and text is simply measured with that.
 */
export async function loadFonts(ids: readonly FontId[]): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  const loads = ids.flatMap((id) =>
    ([400, 700] as const).map((weight) => document.fonts.load(fontString(id, weight, 16))),
  );
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, FONT_LOAD_TIMEOUT_MS));
  await Promise.race([Promise.allSettled(loads).then(() => undefined), timeout]);
}

/** Builder: load every document font before the first text measurement. */
export function loadAllFonts(): Promise<void> {
  return loadFonts(FONT_IDS);
}

/** Just the fonts a form uses, so the fill page does not download all fourteen files. */
export function fontsUsedBy(doc: { elements: readonly DocElement[] }): FontId[] {
  const used = new Set<FontId>();
  for (const el of doc.elements) {
    if (el.type === 'text' || el.type === 'button') used.add(el.fontFamily);
    if (el.type === 'field') {
      used.add(el.labelStyle.fontFamily);
      used.add(el.inputStyle.fontFamily);
      // The signature pad can type a name in the handwriting font.
      if (el.fieldType === 'signature') used.add('caveat');
    }
  }
  return FONT_IDS.filter((id) => used.has(id));
}
