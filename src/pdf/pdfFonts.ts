import type { PDFDocument, PDFFont } from 'pdf-lib';
import { FONTS, type FontId, type FontWeight } from '@/lib/fonts';

/**
 * Kerning and ligatures are off so widths equal the on-screen widths, which are sums of
 * per-character advances (see decisions.md, font spike).
 */
export const FONT_FEATURES = { kern: false, liga: false, clig: false, calt: false } as const;

const bytesCache = new Map<string, Promise<Uint8Array>>();

/** Fetches a TTF once per page load. Failed fetches are forgotten so a retry can work. */
export function fetchFontBytes(id: FontId, weight: FontWeight): Promise<Uint8Array> {
  const url = FONTS[id].files[weight].ttf;
  let pending = bytesCache.get(url);
  if (!pending) {
    pending = fetch(url).then(async (response) => {
      if (!response.ok) throw new Error(`Could not load the font file ${url}`);
      return new Uint8Array(await response.arrayBuffer());
    });
    pending.catch(() => bytesCache.delete(url));
    bytesCache.set(url, pending);
  }
  return pending;
}

/** The fonts embedded in one PDF. Subsetting keeps filled PDFs small; fillable PDFs need full fonts. */
export class FontSet {
  private readonly embedded = new Map<string, Promise<PDFFont>>();
  private readonly glyphs = new WeakMap<PDFFont, Set<number>>();

  private readonly pdf: PDFDocument;
  private readonly subset: boolean;

  constructor(pdf: PDFDocument, subset: boolean) {
    this.pdf = pdf;
    this.subset = subset;
  }

  get(id: FontId, weight: FontWeight): Promise<PDFFont> {
    const key = `${id}-${weight}`;
    let font = this.embedded.get(key);
    if (!font) {
      font = fetchFontBytes(id, weight).then((bytes) =>
        this.pdf.embedFont(bytes, { subset: this.subset, features: FONT_FEATURES }),
      );
      this.embedded.set(key, font);
    }
    return font;
  }

  /** Replaces characters the font lacks with `?`. `replaced` says whether anything changed. */
  makeSafe(font: PDFFont, text: string): { text: string; replaced: boolean } {
    let set = this.glyphs.get(font);
    if (!set) {
      set = new Set(font.getCharacterSet());
      this.glyphs.set(font, set);
    }
    let replaced = false;
    let result = '';
    for (const char of text) {
      const code = char.codePointAt(0) ?? 0;
      if (set.has(code)) {
        result += char;
      } else {
        replaced = true;
        result += set.has(63) ? '?' : ' ';
      }
    }
    return { text: result, replaced };
  }
}
