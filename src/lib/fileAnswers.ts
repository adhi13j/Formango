/**
 * The actual File objects behind file-field answers. An answer is only the file's name (so the
 * answers object stays plain data); the bytes live here, keyed by field id, until the form is
 * submitted or reset. Phase 3 uploads from this map.
 */
const files = new Map<string, File>();

export function setAnswerFile(fieldId: string, file: File | undefined): void {
  if (file) files.set(fieldId, file);
  else files.delete(fieldId);
}

export function getAnswerFile(fieldId: string): File | undefined {
  return files.get(fieldId);
}

export function clearAnswerFiles(): void {
  files.clear();
}
