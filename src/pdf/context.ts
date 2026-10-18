import type { PDFDocument, PDFForm, PDFPage } from 'pdf-lib';
import type { FontSet } from './pdfFonts';
import type { PdfPageGeometry } from './units';

export type PdfMode = 'filled' | 'fillable';

/** Everything the drawing functions share while one PDF is being built. */
export interface PdfContext {
  pdf: PDFDocument;
  page: PDFPage;
  g: PdfPageGeometry;
  fonts: FontSet;
  mode: PdfMode;
  /** Set only in fillable mode. */
  form: PDFForm | null;
  warnings: Set<string>;
  /** How many entries each repeating group has in this PDF, by element id. */
  groupRows: Record<string, number>;
}

export const MISSING_GLYPH_WARNING =
  'Some characters are not in the form font, so they were replaced with "?" in the PDF.';
