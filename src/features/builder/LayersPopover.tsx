import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Image,
  Layers,
  Lock,
  Minus,
  MousePointerClick,
  Shapes,
  TextCursorInput,
  Type,
  Unlock,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { IconButton } from '@/components/common/IconButton';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useDocStore } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';
import type { DocElement } from '@/types/doc';

const ICONS: Record<DocElement['type'], ReactNode> = {
  text: <Type size={16} />,
  shape: <Shapes size={16} />,
  line: <Minus size={16} />,
  image: <Image size={16} />,
  field: <TextCursorInput size={16} />,
  button: <MousePointerClick size={16} />,
};

function LayerRow({
  el,
  selected,
  canRaise,
  canLower,
}: {
  el: DocElement;
  selected: boolean;
  canRaise: boolean;
  canLower: boolean;
}) {
  const [renaming, setRenaming] = useState(false);
  const store = useDocStore.getState;
  const rename = (value: string) => {
    store().renameElement(el.id, value);
    setRenaming(false);
  };
  return (
    <li
      className={cn(
        'flex items-center gap-1 rounded-md px-1 py-0.5',
        selected ? 'bg-accent' : 'hover:bg-muted',
        el.hidden && 'opacity-60',
      )}
    >
      <span
        className="flex size-6 flex-none items-center justify-center text-muted-foreground"
        aria-hidden="true"
      >
        {ICONS[el.type]}
      </span>
      {renaming ? (
        <input
          autoFocus
          aria-label="Layer name"
          defaultValue={el.name}
          maxLength={120}
          onFocus={(event) => event.target.select()}
          onBlur={(event) => rename(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') rename(event.currentTarget.value);
            if (event.key === 'Escape') setRenaming(false);
          }}
          className="h-7 min-w-0 flex-1 rounded border border-input bg-card px-1 text-sm"
        />
      ) : (
        <button
          type="button"
          aria-pressed={selected}
          onClick={(event) =>
            event.shiftKey || event.metaKey || event.ctrlKey
              ? useUiStore.getState().toggleSelect(el.id)
              : useUiStore.getState().select([el.id])
          }
          onDoubleClick={() => setRenaming(true)}
          title="Double-click to rename"
          className="min-w-0 flex-1 truncate rounded px-1 py-1 text-left text-sm text-foreground"
        >
          {el.name}
        </button>
      )}
      <IconButton
        label={el.hidden ? 'Show' : 'Hide'}
        className="size-7"
        onClick={() => store().setHidden([el.id], !el.hidden)}
      >
        {el.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
      </IconButton>
      <IconButton
        label={el.locked ? 'Unlock' : 'Lock'}
        className="size-7"
        onClick={() => store().setLocked([el.id], !el.locked)}
      >
        {el.locked ? <Lock size={16} /> : <Unlock size={16} />}
      </IconButton>
      <IconButton
        label="Bring forward"
        className="size-7"
        disabled={!canRaise}
        onClick={() => store().reorder([el.id], 'forward')}
      >
        <ArrowUp size={16} />
      </IconButton>
      <IconButton
        label="Send backward"
        className="size-7"
        disabled={!canLower}
        onClick={() => store().reorder([el.id], 'backward')}
      >
        <ArrowDown size={16} />
      </IconButton>
    </li>
  );
}

export function LayersPopover() {
  const open = useUiStore((s) => s.layersOpen);
  const setOpen = useUiStore((s) => s.setLayersOpen);
  const selectedIds = useUiStore((s) => s.selectedIds);
  const elements = useDocStore((s) => s.doc.elements);
  const top = [...elements].reverse();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" aria-expanded={open}>
          <Layers size={16} aria-hidden="true" />
          Layers
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-80 p-2" aria-label="Layers">
        {top.length === 0 ? (
          <p className="m-0 p-4 text-center text-sm text-muted-foreground">
            Nothing on this page yet
          </p>
        ) : (
          <ul className="m-0 max-h-80 list-none space-y-0.5 overflow-y-auto p-0">
            {top.map((el, index) => (
              <LayerRow
                key={el.id}
                el={el}
                selected={selectedIds.includes(el.id)}
                canRaise={index > 0}
                canLower={index < top.length - 1}
              />
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
