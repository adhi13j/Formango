import type { LineElement } from '@/types/doc';

const DASH = 6;
const GAP = 4;

export function LineView({ el }: { el: LineElement }) {
  const background =
    el.style === 'dashed'
      ? `repeating-linear-gradient(to right, ${el.color} 0, ${el.color} ${DASH}px, transparent ${DASH}px, transparent ${DASH + GAP}px)`
      : el.color;
  return <div style={{ width: '100%', height: el.thickness, background }} />;
}
