import {
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  Layers,
  Lock,
  Move,
  Trash2,
  Unlock,
} from 'lucide-react';
import { IconButton } from '@/components/common/IconButton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { minSizeOf } from '@/lib/normalize';
import { useDocStore, type ReorderMode } from '@/store/docStore';
import type { DocElement } from '@/types/doc';
import { deleteSelection, duplicateSelection } from '../editorActions';
import { formatShortcut } from '../shortcuts';
import { NumberField, Separator } from './kit';

function ArrangeMenu({ els }: { els: DocElement[] }) {
  const all = useDocStore((s) => s.doc.elements);
  const indices = els.map((el) => all.indexOf(el)).sort((a, b) => a - b);
  const atTop = indices.every((index, i) => index === all.length - indices.length + i);
  const atBottom = indices.every((index, i) => index === i);
  const run = (mode: ReorderMode) =>
    useDocStore.getState().reorder(
      els.map((el) => el.id),
      mode,
    );
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Arrange">
              <Layers size={20} strokeWidth={1.75} />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Arrange</TooltipContent>
      </Tooltip>
      <DropdownMenuContent>
        <DropdownMenuItem disabled={atTop} onSelect={() => run('front')}>
          <ArrowUpToLine size={16} aria-hidden="true" /> Bring to front
        </DropdownMenuItem>
        <DropdownMenuItem disabled={atTop} onSelect={() => run('forward')}>
          Bring forward
        </DropdownMenuItem>
        <DropdownMenuItem disabled={atBottom} onSelect={() => run('backward')}>
          Send backward
        </DropdownMenuItem>
        <DropdownMenuItem disabled={atBottom} onSelect={() => run('back')}>
          <ArrowDownToLine size={16} aria-hidden="true" /> Send to back
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PositionPopover({ el }: { el: DocElement }) {
  const page = useDocStore((s) => s.doc.page);
  const min = minSizeOf(el);
  const heightLocked =
    (el.type === 'text' && el.autoHeight) ||
    el.type === 'line' ||
    (el.type === 'field' && (el.fieldType === 'radio' || el.fieldType === 'checkbox'));
  const update = (patch: Partial<DocElement>) => useDocStore.getState().updateElement(el.id, patch);
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Position and size">
              <Move size={20} strokeWidth={1.75} />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Position and size</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-60" aria-label="Position and size">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            X
            <NumberField
              label="X position"
              value={el.x}
              min={0}
              max={page.width}
              width="w-full"
              onCommit={(x) => update({ x })}
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            Y
            <NumberField
              label="Y position"
              value={el.y}
              min={0}
              max={20000}
              width="w-full"
              onCommit={(y) => update({ y })}
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            W
            <NumberField
              label="Width"
              value={el.width}
              min={min.width}
              max={page.width}
              width="w-full"
              onCommit={(width) => update({ width })}
            />
          </div>
          <div
            className="flex items-center gap-2 text-sm"
            title={heightLocked ? 'Height follows the content' : undefined}
          >
            H
            <NumberField
              label="Height"
              value={el.height}
              min={Math.max(1, min.height)}
              max={20000}
              width="w-full"
              onCommit={(height) => !heightLocked && update({ height })}
            />
          </div>
        </div>
        {heightLocked && (
          <p className="m-0 mt-2 text-xs text-muted-foreground">Height follows the content.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Layer menu, duplicate, delete, lock, and position. Shown at the right end of every selection toolbar. */
export function CommonActions({ els }: { els: DocElement[] }) {
  const allLocked = els.every((el) => el.locked);
  const anyLocked = els.some((el) => el.locked);
  const ids = els.map((el) => el.id);
  return (
    <>
      <Separator />
      <ArrangeMenu els={els} />
      <IconButton
        label="Duplicate"
        shortcut={formatShortcut('duplicate')}
        onClick={duplicateSelection}
      >
        <Copy size={20} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        label={anyLocked ? 'Locked elements cannot be deleted' : 'Delete'}
        shortcut={formatShortcut('delete')}
        disabled={anyLocked}
        onClick={deleteSelection}
      >
        <Trash2 size={20} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        label={allLocked ? 'Unlock' : 'Lock'}
        pressed={allLocked}
        onClick={() => useDocStore.getState().setLocked(ids, !allLocked)}
      >
        {allLocked ? (
          <Lock size={20} strokeWidth={1.75} />
        ) : (
          <Unlock size={20} strokeWidth={1.75} />
        )}
      </IconButton>
      {els.length === 1 && els[0] && <PositionPopover el={els[0]} />}
    </>
  );
}
