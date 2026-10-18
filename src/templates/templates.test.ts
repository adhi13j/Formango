import { describe, expect, it } from 'vitest';
import { normalizeDoc } from '@/lib/normalize';
import { parseDoc } from '@/types/doc.schema';
import contactForm from './contact-form.json';
import eventRegistration from './event-registration.json';
import { TEMPLATES } from './index';

describe('templates', () => {
  it.each([
    ['contact-form', contactForm],
    ['event-registration', eventRegistration],
  ])('%s validates against the schema', (_name, json) => {
    const result = parseDoc(json);
    expect(result.ok).toBe(true);
  });

  it('loads both starter templates', () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual(['contact-form', 'event-registration']);
  });

  it('uses unique field keys and stays inside the 20px margins', () => {
    for (const { doc } of TEMPLATES) {
      const keys = doc.elements.flatMap((el) => (el.type === 'field' ? [el.key] : []));
      expect(new Set(keys).size).toBe(keys.length);
      for (const el of doc.elements.filter((e) => e.type !== 'shape')) {
        expect(el.x).toBeGreaterThanOrEqual(20);
        expect(el.x + el.width).toBeLessThanOrEqual(370);
      }
    }
  });

  it('needs no repositioning when applied (text heights depend on real fonts, so they are skipped)', () => {
    for (const { doc } of TEMPLATES) {
      const normalized = normalizeDoc(doc);
      const geometry = (els: typeof doc.elements) =>
        els.map((e) => [e.id, e.x, e.y, e.width, e.type === 'text' ? 0 : e.height]);
      expect(geometry(normalized.elements)).toEqual(geometry(doc.elements));
    }
  });
});
