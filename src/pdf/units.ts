import { displayHeight, type Rect } from '@/lib/geometry';
import type { FormDoc } from '@/types/doc';

export const PDF_PAGE_WIDTH = 595.28;
export const PDF_A4_HEIGHT = 841.89;

export interface PdfPageGeometry {
  /** Points per document pixel. */
  scale: number;
  /** Page width in points. */
  width: number;
  /** Page height in points. */
  height: number;
}

/**
 * A4 forms are one A4 page. Mobile forms are one tall page of the same width, as high as the
 * design is on screen (proper A4 pagination of long mobile forms is a later improvement).
 */
export function pdfGeometry(doc: Pick<FormDoc, 'page' | 'elements'>): PdfPageGeometry {
  const scale = PDF_PAGE_WIDTH / doc.page.width;
  const height = doc.page.preset === 'a4' ? PDF_A4_HEIGHT : displayHeight(doc) * scale;
  return { scale, width: PDF_PAGE_WIDTH, height };
}

/** A document-pixel rectangle as a PDF rectangle: points, with the origin at the bottom left. */
export function toPdfRect(g: PdfPageGeometry, rect: Rect): Rect {
  return {
    x: rect.x * g.scale,
    y: g.height - (rect.y + rect.height) * g.scale,
    width: rect.width * g.scale,
    height: rect.height * g.scale,
  };
}

/** A y coordinate measured down from the top of the page (document px) as a PDF y in points. */
export function toPdfY(g: PdfPageGeometry, docY: number): number {
  return g.height - docY * g.scale;
}

/** `#FF9F1C` as three numbers from 0 to 1, the form pdf-lib wants. */
export function hexToRgb01(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const channel = (start: number) => parseInt(value.slice(start, start + 2), 16) / 255;
  return [channel(0), channel(2), channel(4)];
}
