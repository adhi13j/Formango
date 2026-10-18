import { describe, expect, it } from 'vitest';
import { friendlyAuthError, validateCredentials } from './authErrors';

describe('validateCredentials', () => {
  it('accepts a normal sign in', () => {
    expect(validateCredentials('a@b.co', 'x', false)).toBeNull();
  });
  it('rejects bad emails and empty passwords', () => {
    expect(validateCredentials('nope', 'x', false)).toBe('Enter a valid email address.');
    expect(validateCredentials('a@b.co', '', false)).toBe('Enter your password.');
  });
  it('asks sign ups for at least 8 characters', () => {
    expect(validateCredentials('a@b.co', '1234567', true)).toMatch(/at least 8/);
    expect(validateCredentials('a@b.co', '12345678', true)).toBeNull();
  });
});

describe('friendlyAuthError', () => {
  it.each([
    ['Invalid login credentials', 'That email or password is not right.'],
    ['User already registered', 'That email already has an account. Try signing in instead.'],
    [
      'Password should be at least 6 characters',
      'Choose a stronger password of at least 8 characters.',
    ],
    ['email rate limit exceeded', 'Too many tries. Please wait a minute and try again.'],
    ['Failed to fetch', 'Could not reach the server. Check your connection and try again.'],
    ['weird internal thing', 'Something went wrong. Please try again.'],
  ])('%s', (input, expected) => {
    expect(friendlyAuthError(input)).toBe(expected);
  });
});
