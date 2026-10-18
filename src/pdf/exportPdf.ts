import { fontsUsedBy, loadFonts } from '@/lib/fonts';
import type { Answers, DocElement, FormDoc } from '@/types/doc';
import type { PdfContext, PdfMode } from './context';
import { drawField } from './drawField';
import { drawImageElement } from './drawImage';
import { drawLineElement, drawBox, drawPageBackground } from './drawShapes';
import { drawTextElement } from './drawText';
import { FontSet } from './pdfFonts';
import { pdfGeometry } from './units';

export interface ExportOptions {
  mode: PdfMode;
}

export interface ExportResult {
  bytes: Uint8Array;
  /** Things worth telling the person, such as characters the font lacks. */
  warnings: string[];
}

async function drawElement(
  ctx: PdfContext,
  el: DocElement,
  answers: Answers | null,
): Promise<void> {
  switch (el.type) {
    case 'shape':
      drawBox(ctx, {
        rect: el,
        fill: el.fill,
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        radius: el.radius,
        ellipse: el.shape === 'ellipse',
        opacity: el.opacity,
      });
      return;
    case 'line':
      drawLineElement(ctx, el);
      return;
    case 'text':
      await drawTextElement(ctx, el);
      return;
    case 'image':
      await drawImageElement(ctx, el);
      return;
    case 'field':
      await drawField(ctx, el, answers?.[el.id]);
      return;
    case 'button':
      // There is nothing to press on paper.
      return;
    default: {
      const unreachable: never = el;
      return unreachable;
    }
  }
}

/**
 * Draws the design at its saved coordinates. `filled` flattens the answers into the page;
 * `fillable` adds real form fields that can be typed into in any PDF reader. pdf-lib is loaded
 * on first use so it stays out of the main bundle.
 */
export async function exportPdf(
  doc: FormDoc,
  answers: Answers | null,
  options: ExportOptions = { mode: 'filled' },
): Promise<ExportResult> {
  const [{ PDFDocument }, fontkitModule] = await Promise.all([
    import('pdf-lib'),
    import('@pdf-lib/fontkit'),
    loadFonts(fontsUsedBy(doc)),
  ]);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkitModule.default);
  pdf.setTitle(doc.title);
  pdf.setCreator('Formango');
  const g = pdfGeometry(doc);
  const page = pdf.addPage([g.width, g.height]);
  const ctx: PdfContext = {
    pdf,
    page,
    g,
    // Fillable PDFs need whole fonts: characters typed later must have glyphs.
    fonts: new FontSet(pdf, options.mode === 'filled'),
    mode: options.mode,
    form: options.mode === 'fillable' ? pdf.getForm() : null,
    warnings: new Set(),
  };

  drawPageBackground(ctx, doc.page.background);
  for (const el of doc.elements) {
    if (el.hidden) continue;
    await drawElement(ctx, el, answers);
  }
  const bytes = await pdf.save();
  return { bytes, warnings: [...ctx.warnings] };
}
