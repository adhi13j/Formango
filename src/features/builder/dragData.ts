import type { NewElementKind } from '@/lib/elements';

/** MIME type used when dragging from the rail panels onto the page. */
export const ELEMENT_MIME = 'application/x-formango-element';

export type DragPayload =
  { kind: NewElementKind } | { image: { src: string; width: number; height: number; alt: string } };

export function setDragPayload(event: React.DragEvent, payload: DragPayload): void {
  event.dataTransfer.setData(ELEMENT_MIME, JSON.stringify(payload));
  event.dataTransfer.effectAllowed = 'copy';
}

export function readDragPayload(dataTransfer: DataTransfer): DragPayload | null {
  const raw = dataTransfer.getData(ELEMENT_MIME);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    if ('kind' in parsed && typeof parsed.kind === 'string')
      return { kind: parsed.kind as NewElementKind };
    if ('image' in parsed) return parsed as DragPayload;
  } catch {
    // Not ours.
  }
  return null;
}

export function hasElementDrag(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes(ELEMENT_MIME);
}
