import { dataUrlBytes, validateImageFile } from '@/lib/images';

/** A signature is stored as one small PNG that fits inside this box. */
export const SIGNATURE_WIDTH = 400;
export const SIGNATURE_HEIGHT = 150;
export const SIGNATURE_PADDING = 8;
export const SIGNATURE_MAX_BYTES = 60_000;
export const SIGNATURE_INK = '#2A1805';
export const SIGNATURE_STROKE = 2.5;
const SHRINK_STEP = 0.8;
const MAX_SHRINKS = 6;

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The smallest rectangle holding every pixel that is not fully transparent, or null if blank. */
export function inkBounds(data: Uint8ClampedArray, width: number, height: number): Bounds | null {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((data[(y * width + x) * 4 + 3] ?? 0) > 0) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (right < 0) return null;
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/** Scale that fits (width, height) inside the signature box. Never enlarges. */
export function signatureScale(width: number, height: number): number {
  return Math.min(1, SIGNATURE_WIDTH / width, SIGNATURE_HEIGHT / height);
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('This browser cannot draw signatures.');
  return [canvas, ctx];
}

/**
 * Crops the picture to its ink (plus padding), shrinks it to fit 400 x 150, and re-encodes it as a
 * PNG under about 60 KB. Returns null when nothing was drawn.
 */
export function exportSignature(
  source: HTMLCanvasElement,
  options: { crop: boolean } = { crop: true },
): string | null {
  const ctx = source.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const bounds = options.crop
    ? inkBounds(
        ctx.getImageData(0, 0, source.width, source.height).data,
        source.width,
        source.height,
      )
    : { x: 0, y: 0, width: source.width, height: source.height };
  if (!bounds) return null;
  const pad = options.crop ? SIGNATURE_PADDING : 0;
  const sx = Math.max(0, bounds.x - pad);
  const sy = Math.max(0, bounds.y - pad);
  const sw = Math.min(source.width - sx, bounds.width + pad * 2);
  const sh = Math.min(source.height - sy, bounds.height + pad * 2);
  let scale = signatureScale(sw, sh);
  let result = '';
  for (let attempt = 0; attempt <= MAX_SHRINKS; attempt += 1) {
    const [out, outCtx] = makeCanvas(sw * scale, sh * scale);
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(source, sx, sy, sw, sh, 0, 0, out.width, out.height);
    result = out.toDataURL('image/png');
    if (dataUrlBytes(result) <= SIGNATURE_MAX_BYTES) break;
    scale *= SHRINK_STEP;
  }
  return result;
}

/** Draws a typed name in the handwriting font onto a transparent canvas. */
export function typedSignatureCanvas(text: string): HTMLCanvasElement | null {
  const name = text.trim();
  if (!name) return null;
  const size = 96;
  const font = `700 ${size}px Caveat, cursive`;
  const [canvas, ctx] = makeCanvas(2400, size * 2);
  ctx.font = font;
  const width = Math.min(2400, Math.ceil(ctx.measureText(name).width) + size);
  canvas.width = width; // resizing clears the canvas and its font, so set the font again
  ctx.font = font;
  ctx.fillStyle = SIGNATURE_INK;
  ctx.textBaseline = 'middle';
  ctx.fillText(name, size / 2, size);
  return canvas;
}

/** Reads a signature image the person uploaded (PNG, JPEG, or WebP) onto a canvas. */
export async function uploadedSignatureCanvas(file: File): Promise<HTMLCanvasElement> {
  validateImageFile(file);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That image couldn't be read. Try a different file.");
  }
  const [canvas, ctx] = makeCanvas(bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}
