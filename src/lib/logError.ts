/** The one place errors are logged, so the destination can be swapped later. */
export function logError(context: string, error: unknown): void {
  console.error(`[formango] ${context}`, error);
}
