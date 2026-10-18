import { describe, expect, it } from 'vitest';
import { relativeTime } from './relativeTime';

const now = new Date('2026-03-10T12:00:00Z');
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString();

describe('relativeTime', () => {
  it('says just now for the last moments', () => {
    expect(relativeTime(ago(10), now)).toBe('just now');
  });
  it('uses minutes, hours, and days', () => {
    expect(relativeTime(ago(5 * 60), now)).toBe('5 minutes ago');
    expect(relativeTime(ago(2 * 3600), now)).toBe('2 hours ago');
    expect(relativeTime(ago(3 * 86400), now)).toBe('3 days ago');
  });
  it('says yesterday', () => {
    expect(relativeTime(ago(86400), now)).toBe('yesterday');
  });
  it('returns nothing for a date that cannot be read', () => {
    expect(relativeTime('nope', now)).toBe('');
  });
});
