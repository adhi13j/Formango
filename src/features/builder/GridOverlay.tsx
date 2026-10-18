import { gridColumns } from '@/lib/snap';
import type { FormDoc } from '@/types/doc';

/**
 * The layout grid made visible: faint column bands inside the page margins. Elements snap to the
 * edges of these columns while you drag. Mobile pages show two half-width columns, A4 shows twelve.
 */
export function GridOverlay({ doc, height }: { doc: Pick<FormDoc, 'page'>; height: number }) {
  const { page } = doc;
  // Mobile lists the full-width column first (a snap target); only the halves are drawn.
  const columns = page.preset === 'mobile' ? gridColumns(doc).slice(1) : gridColumns(doc);
  return (
    <div
      data-testid="grid-overlay"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {columns.map(([left, right]) => (
        <div
          key={left}
          style={{
            position: 'absolute',
            left,
            width: right - left,
            top: 0,
            height,
            background: 'var(--selection)',
            opacity: 0.07,
          }}
        />
      ))}
    </div>
  );
}
