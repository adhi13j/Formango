import { describe, expect, it } from 'vitest';
import { rectOf, rectsIntersect } from '@/lib/geometry';
import { parseDoc } from '@/types/doc.schema';
import type { DocElement } from '@/types/doc';
import { TEMPLATES } from './index';

const IDS = [
  'contact-form',
  'event-registration',
  'customer-feedback',
  'newsletter-signup',
  'wedding-rsvp',
  'support-request',
  'lunch-order',
  'job-application',
];

describe('templates', () => {
  it('loads every starter template', () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual(IDS);
  });

  it.each(TEMPLATES.map((t) => [t.id, t] as const))(
    '%s re-validates and has one submit button',
    (_id, t) => {
      const result = parseDoc(JSON.parse(JSON.stringify(t.doc)));
      expect(result.ok).toBe(true);
      expect(t.doc.elements.filter((el) => el.type === 'button')).toHaveLength(1);
    },
  );

  it('uses unique field keys', () => {
    for (const { doc } of TEMPLATES) {
      const keys = doc.elements.flatMap((el) => (el.type === 'field' ? [el.key] : []));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('keeps content inside the page margins (decorations may bleed)', () => {
    for (const { id, doc } of TEMPLATES) {
      for (const el of doc.elements.filter((e) => e.type !== 'shape')) {
        const ok = el.x >= doc.page.margin && el.x + el.width <= doc.page.width - doc.page.margin;
        expect(ok, `${id}: ${el.name}`).toBe(true);
      }
    }
  });

  it('does not stack texts, fields, and the button on top of each other', () => {
    for (const { id, doc } of TEMPLATES) {
      const content: DocElement[] = doc.elements.filter(
        (e) => e.type === 'text' || e.type === 'field' || e.type === 'button',
      );
      content.forEach((a, i) =>
        content.slice(i + 1).forEach((b) => {
          expect(rectsIntersect(rectOf(a), rectOf(b)), `${id}: ${a.name} / ${b.name}`).toBe(false);
        }),
      );
    }
  });

  it('keeps the A4 template on its single page', () => {
    const a4 = TEMPLATES.find((t) => t.id === 'job-application');
    expect(a4?.doc.elements.every((el) => el.y + el.height <= 1123)).toBe(true);
  });
});
