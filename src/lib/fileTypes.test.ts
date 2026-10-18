import { describe, expect, it } from 'vitest';
import { acceptAttribute, checkFile, describeFileRules, formatBytes } from './fileTypes';

const rules = { fileKinds: ['image', 'pdf'] as const, maxFileMb: 2 };
const mutable = { fileKinds: [...rules.fileKinds], maxFileMb: rules.maxFileMb };

describe('file rules', () => {
  it('builds the accept attribute from the allowed kinds', () => {
    expect(acceptAttribute(mutable)).toBe('.png,.jpg,.jpeg,.webp,.gif,.pdf');
  });

  it('accepts a matching file within the limit', () => {
    expect(checkFile({ name: 'Photo.JPG', size: 1000 }, mutable)).toBeNull();
  });

  it('rejects a type that is not allowed', () => {
    expect(checkFile({ name: 'sheet.xlsx', size: 1000 }, mutable)).toMatch(/not allowed/);
  });

  it('rejects a file over the size limit and says the limit', () => {
    expect(checkFile({ name: 'a.pdf', size: 3 * 1024 * 1024 }, mutable)).toMatch(/limit is 2 MB/);
  });

  it('rejects empty files and files with no extension', () => {
    expect(checkFile({ name: 'a.pdf', size: 0 }, mutable)).toMatch(/empty/);
    expect(checkFile({ name: 'README', size: 10 }, mutable)).toMatch(/not allowed/);
  });

  it('allows every supported kind when none are chosen', () => {
    expect(checkFile({ name: 'a.docx', size: 10 }, { fileKinds: [], maxFileMb: 5 })).toBeNull();
  });

  it('describes the rules in plain words', () => {
    expect(describeFileRules({ fileKinds: ['pdf'], maxFileMb: 5 })).toBe('PDF up to 5 MB');
    expect(describeFileRules({ fileKinds: ['image', 'pdf'], maxFileMb: 10 })).toBe(
      'Images, PDF up to 10 MB',
    );
    expect(describeFileRules({ fileKinds: [], maxFileMb: 5 })).toBe(
      'Images, PDF, Documents, Spreadsheets up to 5 MB',
    );
  });

  it('formats sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1_572_864)).toBe('1.5 MB');
  });
});
