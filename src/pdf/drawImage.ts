import type { ImageElement } from '@/types/doc';
import type { PdfContext } from './context';
import { toPdfRect } from './units';

const MAX_SIDE_PX = 2400;
const DETAIL = 2;

async function loadBitmap(src: string): Promise<ImageBitmap> {
  const response = await fetch(src);
  if (!response.ok) throw new Error('An image could not be loaded');
  return createImageBitmap(await response.blob());
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('An image could not be encoded'))),
      type,
      quality,
    ),
  );
}

/**
 * pdf-lib only embeds PNG and JPEG, and cannot crop, round, or fade. So each image is drawn onto
 * a canvas first (fit, corner radius, opacity applied) at twice its size and embedded as a picture.
 */
export async function drawImageElement(ctx: PdfContext, el: ImageElement): Promise<void> {
  const bitmap = await loadBitmap(el.src);
  const factor = Math.min(DETAIL, MAX_SIDE_PX / Math.max(el.width, el.height));
  const width = Math.max(1, Math.round(el.width * factor));
  const height = Math.max(1, Math.round(el.height * factor));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const c2d = canvas.getContext('2d');
  if (!c2d) throw new Error('Images could not be prepared');

  const opaque = el.radius === 0 && el.opacity === 1 && el.fit === 'cover';
  if (opaque) {
    c2d.fillStyle = '#FFFFFF';
    c2d.fillRect(0, 0, width, height);
  } else {
    c2d.beginPath();
    c2d.roundRect(0, 0, width, height, Math.min(el.radius, el.width / 2, el.height / 2) * factor);
    c2d.clip();
  }
  c2d.globalAlpha = el.opacity;
  const ratio =
    el.fit === 'cover'
      ? Math.max(width / bitmap.width, height / bitmap.height)
      : Math.min(width / bitmap.width, height / bitmap.height);
  const drawWidth = bitmap.width * ratio;
  const drawHeight = bitmap.height * ratio;
  c2d.drawImage(bitmap, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  bitmap.close();

  const embedded = opaque
    ? await ctx.pdf.embedJpg(
        new Uint8Array(await (await toBlob(canvas, 'image/jpeg', 0.9)).arrayBuffer()),
      )
    : await ctx.pdf.embedPng(
        new Uint8Array(await (await toBlob(canvas, 'image/png')).arrayBuffer()),
      );
  ctx.page.drawImage(embedded, toPdfRect(ctx.g, el));
}

/** Draws a data-URL picture (a signature) to fit inside a box without distortion. */
export async function drawPictureContained(
  ctx: PdfContext,
  dataUrl: string,
  box: { x: number; y: number; width: number; height: number },
): Promise<void> {
  const embedded = await ctx.pdf.embedPng(
    new Uint8Array(await (await fetch(dataUrl)).arrayBuffer()),
  );
  const ratio = Math.min(box.width / embedded.width, box.height / embedded.height);
  const width = embedded.width * ratio;
  const height = embedded.height * ratio;
  const rect = toPdfRect(ctx.g, {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height,
  });
  ctx.page.drawImage(embedded, rect);
}
