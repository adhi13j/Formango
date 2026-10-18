import type { ShapeElement } from '@/types/doc';

export function ShapeView({ el }: { el: ShapeElement }) {
  const hasBorder = el.stroke !== null && el.strokeWidth > 0;
  const radius =
    el.shape === 'ellipse' ? '50%' : Math.min(el.radius, Math.min(el.width, el.height) / 2);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        background: el.fill ?? 'transparent',
        border: hasBorder ? `${el.strokeWidth}px solid ${el.stroke}` : 'none',
        borderRadius: radius,
        opacity: el.opacity,
      }}
    />
  );
}
