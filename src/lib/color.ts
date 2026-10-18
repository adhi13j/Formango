/** Accepts #RGB, #RRGGBB, with or without the #, any case. Returns uppercase #RRGGBB or null. */
export function normalizeHex(input: string): string | null {
  const text = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(text)) {
    return `#${[...text].map((c) => c + c).join('')}`.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(text)) return `#${text}`.toUpperCase();
  return null;
}
