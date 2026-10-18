import { rgb } from 'pdf-lib';
import type { Rect } from '@/lib/geometry';
import type { LineElement } from '@/types/doc';
import type { PdfContext } from './context';
import { hexToRgb01, toPdfRect } from './units';

const color = (hex: string) => {
  const [r, g, b] = hexToRgb01(hex);
  return rgb(r, g, b);
};
export { color as pdfColor };

export interface BoxStyle {
  /** Document px, from the top left of the page. */
  rect: Rect;
  fill: string | null;
  stroke: string | null;
  /** Document px. Borders sit inside the box, like CSS. */
  strokeWidth: number;
  radius: number;
  ellipse?: boolean;
  opacity?: number;
  /** Dash and gap lengths in document px. */
  dash?: [number, number];
}

function roundedPath(width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height / 2);
  if (r <= 0) return `M0,0 H${width} V${height} H0 Z`;
  return (
    `M${r},0 H${width - r} A${r},${r} 0 0 1 ${width},${r} V${height - r} ` +
    `A${r},${r} 0 0 1 ${width - r},${height} H${r} A${r},${r} 0 0 1 0,${height - r} V${r} ` +
    `A${r},${r} 0 0 1 ${r},0 Z`
  );
}

interface Pass {
  /** Points, bottom-left origin. */
  rect: Rect;
  radius: number;
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  opacity: number;
  dash?: [number, number] | undefined;
}

function drawPass(ctx: PdfContext, pass: Pass, ellipse: boolean): void {
  const { rect, fill, stroke, strokeWidth, opacity } = pass;
  if (rect.width <= 0 || rect.height <= 0) return;
  const common = {
    ...(fill ? { color: color(fill), opacity } : {}),
    ...(stroke && strokeWidth > 0
      ? {
          borderColor: color(stroke),
          borderWidth: strokeWidth,
          borderOpacity: opacity,
          ...(pass.dash ? { borderDashArray: pass.dash } : {}),
        }
      : {}),
  };
  if (ellipse) {
    ctx.page.drawEllipse({
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
      xScale: rect.width / 2,
      yScale: rect.height / 2,
      ...common,
    });
    return;
  }
  if (pass.radius <= 0) {
    ctx.page.drawRectangle({ ...rect, ...common });
    return;
  }
  // SVG paths are y-down, so the origin is the top left corner in PDF space.
  ctx.page.drawSvgPath(roundedPath(rect.width, rect.height, pass.radius), {
    x: rect.x,
    y: rect.y + rect.height,
    ...common,
  });
}

/**
 * Draws a box the way CSS paints a box with an inside border: the fill reaches the outer edge and
 * the border sits within it. PDF strokes are centered on the path, so the stroke is inset by half
 * its width. With opacity below 1 the fill stops at the border so the two do not stack.
 */
export function drawBox(ctx: PdfContext, style: BoxStyle): void {
  const { g } = ctx;
  const opacity = style.opacity ?? 1;
  const outer = toPdfRect(g, style.rect);
  const sw = style.stroke && style.strokeWidth > 0 ? style.strokeWidth * g.scale : 0;
  const radius = Math.min(style.radius * g.scale, outer.width / 2, outer.height / 2);
  const inset = (rect: Rect, by: number): Rect => ({
    x: rect.x + by,
    y: rect.y + by,
    width: rect.width - by * 2,
    height: rect.height - by * 2,
  });
  const dash = style.dash
    ? ([style.dash[0] * g.scale, style.dash[1] * g.scale] as [number, number])
    : undefined;
  const split = opacity < 1 && sw > 0;

  if (style.fill) {
    const by = split ? sw : 0;
    drawPass(
      ctx,
      {
        rect: inset(outer, by),
        radius: Math.max(0, radius - by),
        fill: style.fill,
        stroke: null,
        strokeWidth: 0,
        opacity,
      },
      Boolean(style.ellipse),
    );
  }
  if (sw > 0) {
    drawPass(
      ctx,
      {
        rect: inset(outer, sw / 2),
        radius: Math.max(0, radius - sw / 2),
        fill: null,
        stroke: style.stroke,
        strokeWidth: sw,
        opacity,
        dash,
      },
      Boolean(style.ellipse),
    );
  }
}

export function drawLineElement(ctx: PdfContext, el: LineElement): void {
  const { g } = ctx;
  const y = g.height - (el.y + el.thickness / 2) * g.scale;
  ctx.page.drawLine({
    start: { x: el.x * g.scale, y },
    end: { x: (el.x + el.width) * g.scale, y },
    thickness: el.thickness * g.scale,
    color: color(el.color),
    ...(el.style === 'dashed' ? { dashArray: [6 * g.scale, 4 * g.scale] } : {}),
  });
}

export function drawPageBackground(ctx: PdfContext, hex: string): void {
  ctx.page.drawRectangle({
    x: 0,
    y: 0,
    width: ctx.g.width,
    height: ctx.g.height,
    color: color(hex),
  });
}
