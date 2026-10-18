import { nanoid } from 'nanoid';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logError } from '@/lib/logError';
import type { FormDoc } from '@/types/doc';

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/** Decodes a base64 data URL into a Blob, or null when it is not one of our image types. */
export function dataUrlToBlob(dataUrl: string): { blob: Blob; extension: string } | null {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  const type = match?.[1];
  const payload = match?.[2];
  const extension = type ? EXTENSIONS[type] : undefined;
  if (!type || !payload || !extension) return null;
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { blob: new Blob([bytes], { type }), extension };
}

/**
 * Moves every image still stored as a data URL into Storage (`form-assets/<uid>/<formId>/`) and
 * swaps in its public URL, which keeps the saved design small. An image that fails to upload keeps
 * its data URL, so nothing is lost. Returns the same doc object when nothing changed.
 */
export async function uploadDataUrlImages(
  client: SupabaseClient,
  doc: FormDoc,
  userId: string,
  formId: string,
): Promise<FormDoc> {
  let changed = false;
  const elements = await Promise.all(
    doc.elements.map(async (el) => {
      if (el.type !== 'image' || !el.src.startsWith('data:')) return el;
      const decoded = dataUrlToBlob(el.src);
      if (!decoded) return el;
      const path = `${userId}/${formId}/${nanoid(10)}.${decoded.extension}`;
      const { error } = await client.storage
        .from('form-assets')
        .upload(path, decoded.blob, { contentType: decoded.blob.type, upsert: false });
      if (error) {
        logError('uploading an image', error);
        return el;
      }
      changed = true;
      const { data } = client.storage.from('form-assets').getPublicUrl(path);
      return { ...el, src: data.publicUrl };
    }),
  );
  return changed ? { ...doc, elements } : doc;
}
