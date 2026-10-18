import { DEFAULT_FILE_MB } from '@/lib/constants';
import type { FieldElement, FileKind } from '@/types/doc';

interface KindInfo {
  label: string;
  /** Lowercase extensions without the dot. */
  extensions: string[];
}

export const FILE_KINDS: Record<FileKind, KindInfo> = {
  image: { label: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
  pdf: { label: 'PDF', extensions: ['pdf'] },
  document: { label: 'Documents', extensions: ['doc', 'docx', 'odt', 'rtf', 'txt'] },
  spreadsheet: { label: 'Spreadsheets', extensions: ['xls', 'xlsx', 'ods', 'csv'] },
};

export const FILE_KIND_IDS = Object.keys(FILE_KINDS) as FileKind[];

type FileRules = Pick<FieldElement, 'fileKinds' | 'maxFileMb'>;

/** An empty list means "any of the supported kinds". */
function kindsOf(rules: FileRules): FileKind[] {
  return rules.fileKinds.length > 0 ? rules.fileKinds : FILE_KIND_IDS;
}

export function allowedExtensions(rules: FileRules): string[] {
  return kindsOf(rules).flatMap((kind) => FILE_KINDS[kind].extensions);
}

/** Value for the `accept` attribute of the file input. */
export function acceptAttribute(rules: FileRules): string {
  return allowedExtensions(rules)
    .map((ext) => `.${ext}`)
    .join(',');
}

/** "PNG, JPG, PDF up to 5 MB", shown under the upload button. */
export function describeFileRules(rules: FileRules): string {
  const names = allowedExtensions(rules).map((ext) => ext.toUpperCase());
  const shown = names.length > 6 ? kindsOf(rules).map((k) => FILE_KINDS[k].label) : names;
  return `${shown.join(', ')} up to ${rules.maxFileMb || DEFAULT_FILE_MB} MB`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}

/** Returns a short message when the file breaks the field's rules, otherwise null. */
export function checkFile(file: Pick<File, 'name' | 'size'>, rules: FileRules): string | null {
  if (!allowedExtensions(rules).includes(extensionOf(file.name))) {
    return `That file type is not allowed. Use ${describeFileRules(rules)}.`;
  }
  if (file.size > rules.maxFileMb * 1024 * 1024) {
    return `That file is ${formatBytes(file.size)}. The limit is ${rules.maxFileMb} MB.`;
  }
  if (file.size === 0) return 'That file is empty.';
  return null;
}
