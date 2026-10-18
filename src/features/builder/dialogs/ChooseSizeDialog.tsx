import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PRESETS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { hasContent } from '@/lib/submitButton';
import { useDocStore } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';
import type { PagePreset } from '@/types/doc';

function PresetIllustration({ preset }: { preset: PagePreset }) {
  return (
    <div
      className="flex h-24 items-center justify-center rounded-md bg-workspace"
      aria-hidden="true"
    >
      <div
        className="border border-border-strong bg-card shadow-sm"
        style={preset === 'mobile' ? { width: 38, height: 72 } : { width: 56, height: 78 }}
      />
    </div>
  );
}

/** The two page sizes as selectable cards. Used when starting any new design. */
export function PresetPicker({
  value,
  onChange,
}: {
  value: PagePreset;
  onChange: (preset: PagePreset) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Page size" className="grid grid-cols-2 gap-3">
      {(Object.keys(PRESETS) as PagePreset[]).map((preset) => {
        const info = PRESETS[preset];
        const selected = value === preset;
        return (
          <button
            key={preset}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(preset)}
            className={cn(
              'flex flex-col gap-2 rounded-lg border bg-card p-3 text-left shadow-sm transition-colors',
              selected
                ? 'border-primary ring-2 ring-primary'
                : 'border-border hover:border-border-strong',
            )}
          >
            <PresetIllustration preset={preset} />
            <span className="font-medium text-foreground">{info.label}</span>
            <span className="text-sm text-muted-foreground">{info.description}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ChooseSizeDialog() {
  const open = useUiStore((s) => s.sizeDialogOpen);
  const setOpen = useUiStore((s) => s.setSizeDialogOpen);
  const pageHasContent = useDocStore((s) => hasContent(s.doc));
  const [choice, setChoice] = useState<PagePreset>('mobile');

  const create = () => {
    useDocStore.getState().newDoc(choice);
    useUiStore.getState().clearSelection();
    useUiStore.getState().setZoom(1, { fit: true });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose a size</DialogTitle>
          <DialogDescription>
            {pageHasContent
              ? 'This starts a new design. You can undo it right after.'
              : 'You can change this later from the bar at the bottom.'}
          </DialogDescription>
        </DialogHeader>
        <PresetPicker value={choice} onChange={setChoice} />
        <DialogFooter>
          <Button onClick={create}>Create design</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
