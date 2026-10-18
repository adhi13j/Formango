import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { createElement } from '@/lib/elements';
import { createBlankDoc } from '@/types/doc.schema';
import type { FormDoc } from '@/types/doc';
import { dataUrlToBlob, uploadDataUrlImages } from './assets';

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function client(failUpload = false) {
  const uploads: string[] = [];
  const fake = {
    storage: {
      from: () => ({
        upload: (path: string) => {
          uploads.push(path);
          return Promise.resolve({ error: failUpload ? { message: 'no' } : null });
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }),
      }),
    },
  } as unknown as SupabaseClient;
  return { fake, uploads };
}

const withImage = (src: string): FormDoc => {
  const base = createBlankDoc('mobile');
  const image = {
    ...createElement('rect', base),
    type: 'image',
    src,
    alt: '',
    radius: 0,
    opacity: 1,
    fit: 'cover',
  };
  return { ...base, elements: [image as FormDoc['elements'][number]] };
};

describe('dataUrlToBlob', () => {
  it('decodes png, and rejects other types', () => {
    expect(dataUrlToBlob(PNG)?.extension).toBe('png');
    expect(dataUrlToBlob('data:image/svg+xml;base64,AAAA')).toBeNull();
    expect(dataUrlToBlob('https://x.test/a.png')).toBeNull();
  });
});

describe('uploadDataUrlImages', () => {
  it('uploads into the user and form folder and swaps in the public URL', async () => {
    const { fake, uploads } = client();
    const result = await uploadDataUrlImages(fake, withImage(PNG), 'u1', 'f1');
    expect(uploads[0]).toMatch(/^u1\/f1\/[\w-]{10}\.png$/);
    const image = result.elements[0];
    expect(image?.type === 'image' && image.src).toMatch(/^https:\/\/cdn\.test\/u1\/f1\//);
  });
  it('keeps the data URL when the upload fails', async () => {
    const { fake } = client(true);
    const doc = withImage(PNG);
    expect(await uploadDataUrlImages(fake, doc, 'u1', 'f1')).toBe(doc);
  });
  it('leaves images that are already URLs alone', async () => {
    const { fake, uploads } = client();
    const doc = withImage('https://cdn.test/a.png');
    expect(await uploadDataUrlImages(fake, doc, 'u1', 'f1')).toBe(doc);
    expect(uploads).toHaveLength(0);
  });
});
