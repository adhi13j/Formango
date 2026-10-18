import { fontString, type FontId, type FontWeight } from '@/lib/fonts';

/**
 * The one text layout engine. The editor, the fill page, and the PDF all draw these exact lines,
 * so text never wraps differently between screen and PDF.
 *
 * Widths are the SUM OF PER-CHARACTER ADVANCES measured with geometricPrecision and no kerning.
 * Measuring whole strings is wrong: canvas cannot switch ligatures off, and browsers round advances
 * to whole pixels without geometricPrecision (see docs/decisions.md, Phase 0 spike).
 */

export interface LayoutInput {
  text: string;
  fontFamily: FontId;
  fontSize: number;
  fontWeight: FontWeight;
  maxWidth: number;
  /** Multiplier, for example 1.3. */
  lineHeight: number;
  /** Stop after this many lines and end the last one with an ellipsis. */
  maxLines?: number;
}

export interface LayoutResult {
  lines: string[];
  /** lines.length x lineHeightPx. */
  height: number;
  lineHeightPx: number;
}

export interface FontMetrics {
  ascent: number;
  descent: number;
}

export const ELLIPSIS = '…';

let context: CanvasRenderingContext2D | null = null;
const charWidths = new Map<string, Map<string, number>>();
const metricsCache = new Map<string, FontMetrics>();
const layoutCache = new Map<string, LayoutResult>();
const LAYOUT_CACHE_LIMIT = 500;
let listening = false;

/** Forget every measurement. Called when fonts finish loading, because earlier widths were wrong. */
export function clearTextCaches(): void {
  charWidths.clear();
  metricsCache.clear();
  layoutCache.clear();
}

function getContext(): CanvasRenderingContext2D {
  if (!listening && typeof document !== 'undefined' && 'fonts' in document) {
    listening = true;
    document.fonts.addEventListener('loadingdone', clearTextCaches);
  }
  if (!context) {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    context = ctx;
  }
  context.textRendering = 'geometricPrecision';
  context.fontKerning = 'none';
  return context;
}

function charWidthTable(font: string): Map<string, number> {
  let table = charWidths.get(font);
  if (!table) {
    table = new Map();
    charWidths.set(font, table);
  }
  return table;
}

/** Width of `text` in px: the sum of each character's advance. */
export function measureText(
  text: string,
  fontFamily: FontId,
  fontSize: number,
  fontWeight: FontWeight,
): number {
  const font = fontString(fontFamily, fontWeight, fontSize);
  const table = charWidthTable(font);
  let total = 0;
  let ctx: CanvasRenderingContext2D | null = null;
  for (const char of text) {
    let width = table.get(char);
    if (width === undefined) {
      ctx ??= getContext();
      ctx.font = font;
      width = ctx.measureText(char).width;
      table.set(char, width);
    }
    total += width;
  }
  return total;
}

/** Ascent and descent in px, used to position baselines the same way in the editor and the PDF. */
export function fontMetrics(
  fontFamily: FontId,
  fontSize: number,
  fontWeight: FontWeight,
): FontMetrics {
  const font = fontString(fontFamily, fontWeight, fontSize);
  const cached = metricsCache.get(font);
  if (cached) return cached;
  const ctx = getContext();
  ctx.font = font;
  const measured = ctx.measureText('x');
  const ascent = measured.fontBoundingBoxAscent;
  const descent = measured.fontBoundingBoxDescent;
  const result: FontMetrics =
    Number.isFinite(ascent) && Number.isFinite(descent) && ascent + descent > 0
      ? { ascent, descent }
      : { ascent: fontSize * 0.8, descent: fontSize * 0.2 };
  metricsCache.set(font, result);
  return result;
}

/** Shortens `text` with an ellipsis so it fits `maxWidth`. Returns it unchanged if it already fits. */
export function truncateToWidth(
  text: string,
  fontFamily: FontId,
  fontSize: number,
  fontWeight: FontWeight,
  maxWidth: number,
): string {
  const width = (value: string) => measureText(value, fontFamily, fontSize, fontWeight);
  if (width(text) <= maxWidth) return text;
  const chars = [...text];
  while (chars.length > 0 && width(chars.join('').trimEnd() + ELLIPSIS) > maxWidth) chars.pop();
  return chars.join('').trimEnd() + ELLIPSIS;
}

function wrapParagraph(
  paragraph: string,
  width: (value: string) => number,
  maxWidth: number,
): string[] {
  if (paragraph === '') return [''];
  const lines: string[] = [];
  let line = '';
  const pushChunks = (word: string): string => {
    // A word wider than the box breaks by character.
    let chunk = '';
    for (const char of word) {
      if (chunk !== '' && width(chunk + char) > maxWidth) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk += char;
      }
    }
    return chunk;
  };
  for (const [index, word] of paragraph.split(' ').entries()) {
    const candidate = index === 0 ? word : `${line} ${word}`;
    if (width(candidate) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line !== '') lines.push(line);
    line = width(word) > maxWidth ? pushChunks(word) : word;
  }
  lines.push(line);
  return lines.map((value) => value.trimEnd());
}

export function layoutText(input: LayoutInput): LayoutResult {
  const { text, fontFamily, fontSize, fontWeight, maxWidth, lineHeight, maxLines } = input;
  const key = JSON.stringify([
    text,
    fontFamily,
    fontSize,
    fontWeight,
    maxWidth,
    lineHeight,
    maxLines,
  ]);
  const cached = layoutCache.get(key);
  if (cached) return cached;

  const width = (value: string) => measureText(value, fontFamily, fontSize, fontWeight);
  let lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .flatMap((p) => wrapParagraph(p, width, maxWidth));

  if (maxLines !== undefined && maxLines > 0 && lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    const last = kept[kept.length - 1] ?? '';
    kept[kept.length - 1] = truncateToWidth(
      `${last}${ELLIPSIS}`,
      fontFamily,
      fontSize,
      fontWeight,
      maxWidth,
    );
    lines = kept;
  }

  const lineHeightPx = fontSize * lineHeight;
  const result: LayoutResult = { lines, height: lines.length * lineHeightPx, lineHeightPx };
  if (layoutCache.size >= LAYOUT_CACHE_LIMIT) layoutCache.clear();
  layoutCache.set(key, result);
  return result;
}
