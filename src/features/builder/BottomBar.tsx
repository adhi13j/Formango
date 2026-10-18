import { Check, ChevronUp, Maximize2, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { IconButton } from '@/components/common/IconButton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PRESETS } from '@/lib/constants';
import { useDocStore } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';
import type { PagePreset } from '@/types/doc';
import { ZOOM_PRESETS, zoomIn, zoomOut, zoomTo, zoomToFit } from './editorActions';
import { ConfirmDialog } from './dialogs/ConfirmDialog';
import { LayersPopover } from './LayersPopover';
import { formatShortcut } from './shortcuts';

function SizeChip() {
  const preset = useDocStore((s) => s.doc.page.preset);
  const [pending, setPending] = useState<PagePreset | null>(null);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" aria-label={`Page size: ${PRESETS[preset].label}`}>
            {PRESETS[preset].label}
            <ChevronUp size={14} aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start">
          {(Object.keys(PRESETS) as PagePreset[]).map((key) => (
            <DropdownMenuItem key={key} onSelect={() => key !== preset && setPending(key)}>
              <span className="w-4">
                {key === preset && <Check size={14} aria-hidden="true" />}
              </span>
              {PRESETS[key].label}
              <span className="ml-2 text-xs text-muted-foreground">
                {PRESETS[key].width} px wide
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={pending !== null}
        title={`Switch to ${pending ? PRESETS[pending].label : ''}?`}
        description="Everything stays on the page. Elements are moved and resized only as much as needed to fit the new width. You can undo this."
        confirmLabel="Switch size"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) {
            useDocStore.getState().switchPreset(pending);
            zoomToFit();
          }
          setPending(null);
        }}
      />
    </>
  );
}

export function BottomBar() {
  const zoom = useUiStore((s) => s.zoom);
  return (
    <footer className="flex h-11 items-center justify-between gap-3 border-t border-border bg-card px-3">
      <SizeChip />
      <div className="flex items-center gap-1" role="group" aria-label="Zoom">
        <IconButton label="Zoom out" shortcut={formatShortcut('zoom-out')} onClick={zoomOut}>
          <Minus size={16} />
        </IconButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-16 tabular-nums"
              aria-label={`Zoom ${Math.round(zoom * 100)} percent. Choose a zoom level.`}
            >
              {Math.round(zoom * 100)}%
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top">
            {ZOOM_PRESETS.map((preset) => (
              <DropdownMenuItem key={preset} onSelect={() => zoomTo(preset)}>
                {Math.round(preset * 100)}%
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <IconButton label="Zoom in" shortcut={formatShortcut('zoom-in')} onClick={zoomIn}>
          <Plus size={16} />
        </IconButton>
        <IconButton
          label="Fit page to window"
          shortcut={formatShortcut('zoom-fit')}
          onClick={zoomToFit}
        >
          <Maximize2 size={16} />
        </IconButton>
      </div>
      <LayersPopover />
    </footer>
  );
}
