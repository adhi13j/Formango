import { FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DEFAULT_FILE_MB, MAX_FILE_MB } from '@/lib/constants';
import { FILE_KIND_IDS, FILE_KINDS, describeFileRules } from '@/lib/fileTypes';
import { useDocStore } from '@/store/docStore';
import type { FieldElement, FileKind } from '@/types/doc';
import { NumberField } from './kit';

/** Which file types a file-upload field accepts, and the largest file size. */
export function FileOptions({ el }: { el: FieldElement }) {
  const update = (patch: Partial<FieldElement>) =>
    useDocStore.getState().updateElement(el.id, patch);
  const chosen = el.fileKinds.length > 0 ? el.fileKinds : FILE_KIND_IDS;
  const toggle = (kind: FileKind, on: boolean) => {
    const next = on ? [...chosen, kind] : chosen.filter((k) => k !== kind);
    // The checkbox of the last kind is disabled, so `next` is never empty.
    update({ fileKinds: FILE_KIND_IDS.filter((k) => next.includes(k)) });
  };
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" aria-label="File rules">
              <FileUp size={18} aria-hidden="true" />
              File rules
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Allowed file types and size</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72 space-y-3" aria-label="File rules">
        <fieldset className="m-0 space-y-2 border-0 p-0">
          <legend className="mb-1 p-0 text-sm font-bold text-foreground">Allowed types</legend>
          {FILE_KIND_IDS.map((kind) => {
            const checked = chosen.includes(kind);
            return (
              <label key={kind} className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={checked}
                  disabled={checked && chosen.length === 1}
                  onChange={(event) => toggle(kind, event.target.checked)}
                />
                <span>{FILE_KINDS[kind].label}</span>
                <span className="text-xs text-muted-foreground">
                  {FILE_KINDS[kind].extensions.join(', ')}
                </span>
              </label>
            );
          })}
        </fieldset>
        <div className="flex items-center gap-2 text-sm text-foreground">
          Largest file
          <NumberField
            label="Largest file in megabytes"
            value={el.maxFileMb || DEFAULT_FILE_MB}
            min={1}
            max={MAX_FILE_MB}
            suffix="MB"
            onCommit={(maxFileMb) => update({ maxFileMb })}
          />
        </div>
        <p className="m-0 text-xs text-muted-foreground">Shown as: {describeFileRules(el)}</p>
      </PopoverContent>
    </Popover>
  );
}
