import { describe, expect, it } from 'vitest';
import { pdfFileName } from './downloadPdf';

describe('pdfFileName', () => {
  it('uses a lowercase ASCII slug and the date', () => {
    expect(pdfFileName('Café Order Form!', new Date('2026-03-04T10:00:00Z'))).toBe(
      'cafe-order-form-2026-03-04.pdf',
    );
  });
  it('falls back to "form"', () => {
    expect(pdfFileName('???', new Date('2026-03-04T10:00:00Z'))).toBe('form-2026-03-04.pdf');
  });
});
