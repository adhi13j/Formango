import type { Point } from '@/lib/geometry';

/**
 * Lets code outside the canvas (rail panels, shortcuts, toolbar) ask about the visible part of the
 * page without owning the canvas's DOM. The canvas registers itself while it is mounted.
 */
interface CanvasBridge {
  /** Center of the visible workspace area, in document px. */
  visibleCenter: () => Point;
  /** Converts a screen point (clientX, clientY) to document px. */
  clientToDoc: (client: Point) => Point;
  /** Moves keyboard focus to the canvas, so shortcuts like Enter and arrow keys act on the selection. */
  focus: () => void;
  /** Scrolls so the given document rect is visible. */
  reveal: (rect: { x: number; y: number; width: number; height: number }) => void;
}

let bridge: CanvasBridge | null = null;

export function registerCanvas(next: CanvasBridge | null): void {
  bridge = next;
}

export function getCanvas(): CanvasBridge | null {
  return bridge;
}
