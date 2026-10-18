import { toast } from 'sonner';
import { downloadBlob } from '@/lib/download';
import { logError } from '@/lib/logError';
import { slugify } from '@/lib/slug';
import type { Answers, FormDoc } from '@/types/doc';
import type { PdfMode } from './context';

/** `<title-slug>-<YYYY-MM-DD>.pdf`, lowercase ASCII. */
export function pdfFileName(title: string, date: Date = new Date()): string {
  return `${slugify(title, 'form')}-${date.toISOString().slice(0, 10)}.pdf`;
}

/**
 * Builds the PDF and saves it. Warnings (characters the font lacks) show as a toast and the file
 * still downloads. Failures show a message and are logged. The PDF code loads only when needed.
 */
export async function downloadPdf(
  doc: FormDoc,
  answers: Answers | null,
  mode: PdfMode,
): Promise<boolean> {
  try {
    const { exportPdf } = await import('./exportPdf');
    const { bytes, warnings } = await exportPdf(doc, answers, { mode });
    downloadBlob(
      new Blob([bytes.slice().buffer], { type: 'application/pdf' }),
      pdfFileName(doc.title),
    );
    for (const warning of warnings) toast.warning(warning);
    return true;
  } catch (error) {
    logError('downloading the PDF', error);
    toast.error("We couldn't make the PDF. Please try again.");
    return false;
  }
}
