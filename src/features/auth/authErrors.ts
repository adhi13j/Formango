export const MIN_PASSWORD_LENGTH = 8;

/** Checks the email and password before asking the server. Returns a message, or null. */
export function validateCredentials(
  email: string,
  password: string,
  signingUp: boolean,
): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return 'Enter a valid email address.';
  if (!password) return 'Enter your password.';
  if (signingUp && password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`;
  }
  return null;
}

/** Turns the server's wording into short, friendly advice. Never shows raw errors. */
export function friendlyAuthError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes('invalid login')) return 'That email or password is not right.';
  if (text.includes('already registered') || text.includes('already been registered')) {
    return 'That email already has an account. Try signing in instead.';
  }
  if (text.includes('password') && (text.includes('weak') || text.includes('at least'))) {
    return `Choose a stronger password of at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (text.includes('rate limit') || text.includes('too many')) {
    return 'Too many tries. Please wait a minute and try again.';
  }
  if (text.includes('email not confirmed')) return 'Confirm your email first, then sign in.';
  if (text.includes('failed to fetch') || text.includes('network')) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}
