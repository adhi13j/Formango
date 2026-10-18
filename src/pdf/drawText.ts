import { fontMetrics, layoutText, measureText } from '@/lib/text/layoutText';
import type { FontId, FontWeight } from '@/lib/fonts';
import type { TextElement } from '@/types/doc';
import { MISSING_GLYPH_WARNING, type PdfContext } from './context';
import { pdfColor } from './drawShapes';
import { toPdfY } from './units';

/**
 * Baseline of a line, measured down from the top of its line box, placed the way a browser places
 * text: centered in the line box using the font's ascent and descent.
 */
export function baselineIn(
  lineTop: number,
  lineHeightPx: number,
  fontId: FontId,
  size: number,
  weight: FontWeight,
): number {
  const { ascent, descent } = fontMetrics(fontId, size, weight);
  return lineTop + (lineHeightPx - (ascent + descent)) / 2 + ascent;
}

export interface TextRun {
  text: string;
  /** Document px from the left of the page. */
  x: number;
  /** Document px from the top of the page to the baseline. */
  baseline: number;
  fontId: FontId;
  weight: FontWeight;
  /** Document px. */
  size: number;
  color: string;
  opacity?: number;
}

export async function drawRun(ctx: PdfContext, run: TextRun): Promise<void> {
  if (run.text === '') return;
  const font = await ctx.fonts.get(run.fontId, run.weight);
  const safe = ctx.fonts.makeSafe(font, run.text);
  if (safe.replaced) ctx.warnings.add(MISSING_GLYPH_WARNING);
  ctx.page.drawText(safe.text, {
    x: run.x * ctx.g.scale,
    y: toPdfY(ctx.g, run.baseline),
    size: run.size * ctx.g.scale,
    font,
    color: pdfColor(run.color),
    ...(run.opacity !== undefined ? { opacity: run.opacity } : {}),
  });
}

/** Width of a string in document px, measured the same way as on screen. */
export function runWidth(text: string, fontId: FontId, size: number, weight: FontWeight): number {
  return measureText(text, fontId, size, weight);
}

/** Text elements draw the very lines the editor shows, so wrapping cannot differ. */
export async function drawTextElement(ctx: PdfContext, el: TextElement): Promise<void> {
  const { lines, lineHeightPx } = layoutText({
    text: el.text,
    fontFamily: el.fontFamily,
    fontSize: el.fontSize,
    fontWeight: el.fontWeight,
    maxWidth: el.width,
    lineHeight: el.lineHeight,
  });
  for (const [index, line] of lines.entries()) {
    const width = runWidth(line, el.fontFamily, el.fontSize, el.fontWeight);
    const x =
      el.align === 'center'
        ? el.x + (el.width - width) / 2
        : el.align === 'right'
          ? el.x + el.width - width
          : el.x;
    await drawRun(ctx, {
      text: line,
      x,
      baseline: baselineIn(
        el.y + index * lineHeightPx,
        lineHeightPx,
        el.fontFamily,
        el.fontSize,
        el.fontWeight,
      ),
      fontId: el.fontFamily,
      weight: el.fontWeight,
      size: el.fontSize,
      color: el.color,
    });
  }
}
