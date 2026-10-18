import { Grid3x3 } from 'lucide-react';
import { IconButton } from '@/components/common/IconButton';
import { useDocStore } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';
import { SizeChip } from '../BottomBar';
import { ColorControl, Separator } from './kit';

/** Shown when nothing is selected. */
export function PageSettings() {
  const page = useDocStore((s) => s.doc.page);
  const setPage = useDocStore((s) => s.setPage);
  const gridEnabled = useUiStore((s) => s.gridEnabled);
  return (
    <>
      <ColorControl
        label="Page color"
        value={page.background}
        onChange={(hex) => hex && setPage({ background: hex })}
      />
      <ColorControl
        label="Outer background"
        value={page.outerBackground}
        onChange={(hex) => hex && setPage({ outerBackground: hex })}
      />
      <Separator />
      <SizeChip />
      <IconButton
        label={gridEnabled ? 'Hide layout grid' : 'Show layout grid and snap to it'}
        pressed={gridEnabled}
        onClick={() => useUiStore.getState().setGridEnabled(!gridEnabled)}
      >
        <Grid3x3 size={20} strokeWidth={1.75} />
      </IconButton>
    </>
  );
}
