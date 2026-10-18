import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from '@/lib/slug';

describe('slug', () => {
  it('makes lowercase ascii slugs', () => {
    expect(slugify('Café & Bar!')).toBe('cafe-bar');
    expect(slugify('  Event   Registration 2026 ')).toBe('event-registration-2026');
  });
  it('falls back when nothing usable remains', () => {
    expect(slugify('日本語')).toBe('form');
    expect(slugify('***', 'field')).toBe('field');
  });
  it('makes slugs unique', () => {
    expect(uniqueSlug('email', new Set())).toBe('email');
    expect(uniqueSlug('email', new Set(['email']))).toBe('email-2');
    expect(uniqueSlug('email', new Set(['email', 'email-2']))).toBe('email-3');
  });
});
