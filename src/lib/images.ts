import { MAX_IMAGE_BYTES } from '@/lib/constants';

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_SIDE = 1600;

export interface PreparedImage {
  src: string;
  width: number;
  height: number;
}

/** Thrown with a message that is safe to show to the user. */
export class ImageError extends Error {}

/** Scales (width, height) down so the long side is at most `max`. Never scales up. */
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const longSide = Math.max(width, height);
  if (longSide <= max) return { width, height };
  const scale = max / longSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Rough size in bytes of the file inside a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  return Math.floor(((dataUrl.length - comma - 1) * 3) / 4);
}

export function validateImageFile(file: Pick<File, 'type' | 'size' | 'name'>): void {
  if (file.type === 'image/svg+xml' || /\.svgz?$/i.test(file.name)) {
    throw new ImageError(
      "SVG images aren't supported because they can contain scripts. Please use a PNG, JPG, or WebP image.",
    );
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new ImageError('Please choose a PNG, JPG, or WebP image.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageError('That image is larger than 5 MB. Try a smaller one.');
  }
}

function hasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4) if ((data[i] ?? 255) < 255) return true;
  return false;
}

/** Validates, downscales to 1600px, and re-encodes an uploaded image as a small data URL. */
export async function prepareImage(file: File): Promise<PreparedImage> {
  validateImageFile(file);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageError("That image couldn't be read. Try a different file.");
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_IMAGE_SIDE);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new ImageError("This browser can't process images.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const keepPng = file.type === 'image/png' && hasTransparency(ctx, width, height);
  const encode = (quality: number): string => {
    if (keepPng) return canvas.toDataURL('image/png');
    const webp = canvas.toDataURL('image/webp', quality);
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', quality);
  };
  let src = encode(0.85);
  if (dataUrlBytes(src) > MAX_IMAGE_BYTES && !keepPng) src = encode(0.7);
  if (dataUrlBytes(src) > MAX_IMAGE_BYTES) {
    throw new ImageError(
      'That image is still over 1.5 MB after shrinking it. Try a smaller picture.',
    );
  }
  return { src, width, height };
}
