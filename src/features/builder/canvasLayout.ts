import { WORKSPACE_PADDING } from '@/lib/constants';

export interface Viewport {
  width: number;
  height: number;
}

export interface CanvasLayout {
  /** Size of the scrollable content (page plus padding), in screen px. */
  sizerWidth: number;
  sizerHeight: number;
  /** Where the page's top-left sits inside the scrollable content, in screen px. */
  offsetX: number;
  offsetY: number;
}

/** Page is centered horizontally with at least WORKSPACE_PADDING around it. */
export function canvasLayout(
  viewport: Viewport,
  pageWidth: number,
  pageHeight: number,
  zoom: number,
): CanvasLayout {
  const scaledWidth = pageWidth * zoom;
  const scaledHeight = pageHeight * zoom;
  const sizerWidth = Math.max(viewport.width, scaledWidth + WORKSPACE_PADDING * 2);
  const sizerHeight = Math.max(viewport.height, scaledHeight + WORKSPACE_PADDING * 2);
  return {
    sizerWidth,
    sizerHeight,
    offsetX: Math.round((sizerWidth - scaledWidth) / 2),
    offsetY: WORKSPACE_PADDING,
  };
}

/** Zoom that fits the page width, never above 100%. */
export function fitZoom(viewportWidth: number, pageWidth: number): number {
  if (viewportWidth <= 0) return 1;
  // Round down to a whole percent: rounding up could make the page 1px too wide for the window.
  return Math.min(1, Math.floor(((viewportWidth - WORKSPACE_PADDING * 2) / pageWidth) * 100) / 100);
}
