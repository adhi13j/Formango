import { ArrowDown, ArrowUp, ListChecks, Plus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { IconButton } from '@/components/common/IconButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MAX_LABEL_LENGTH, MAX_OPTIONS } from '@/lib/constants';
import { newElementId } from '@/lib/elements';
import { useDocStore } from '@/store/docStore';
import type { FieldElement } from '@/types/doc';

interface Row {
  key: string;
  text: string;
}

/** Trimmed, non-empty, unique (first one wins), at most MAX_OPTIONS. */
export function cleanOptions(rows: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of rows) {
    const text = raw.trim().slice(0, MAX_LABEL_LENGTH);
    if (text && !seen.has(text)) {
      seen.add(text);
      result.push(text);
    }
  }
  return result.slice(0, MAX_OPTIONS);
}

const toRows = (options: readonly string[]): Row[] =>
  options.map((text) => ({ key: newElementId(), text }));

/** Popover list editor for dropdown, radio, and checkbox options. Changes show on the page live. */
export function OptionsEditor({ el }: { el: FieldElement }) {
  const [rows, setRows] = useState<Row[]>(() => toRows(el.options));
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const focusKey = useRef<string | null>(null);

  const push = (next: Row[]) => {
    setRows(next);
    const options = cleanOptions(next.map((row) => row.text));
    if (options.length > 0) useDocStore.getState().updateElement(el.id, { options });
  };
  const set = (key: string, text: string) =>
    push(rows.map((row) => (row.key === key ? { ...row, text } : row)));

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    const [item] = next.splice(index, 1);
    if (item) next.splice(target, 0, item);
    push(next);
  };

  const add = () => {
    if (rows.length >= MAX_OPTIONS) return;
    const key = newElementId();
    focusKey.current = key;
    push([...rows, { key, text: `Option ${rows.length + 1}` }]);
  };

  const onPaste = (event: React.ClipboardEvent<HTMLInputElement>, key: string) => {
    const lines = event.clipboardData
      .getData('text')
      .split(/\r?\n/)
      .filter((line) => line.trim() !== '');
    if (lines.length < 2) return;
    event.preventDefault();
    const index = rows.findIndex((row) => row.key === key);
    const next = [...rows];
    next.splice(index, 1, ...toRows(lines));
    push(next.slice(0, MAX_OPTIONS));
  };

  return (
    <Popover
      onOpenChange={(open) => {
        // On close, show what is really stored (duplicates and blanks removed).
        if (!open)
          setRows(
            toRows(
              useDocStore
                .getState()
                .doc.elements.find((e): e is FieldElement => e.id === el.id && e.type === 'field')
                ?.options ?? el.options,
            ),
          );
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" aria-label="Edit options">
              <ListChecks size={18} aria-hidden="true" />
              Options
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Edit options</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72 space-y-2" aria-label="Options">
        <p className="m-0 text-sm font-bold text-foreground">
          Options ({rows.length} of {MAX_OPTIONS})
        </p>
        <ul className="m-0 max-h-64 list-none space-y-1 overflow-y-auto p-0">
          {rows.map((row, index) => (
            <li key={row.key} className="flex items-center gap-1">
              <Input
                ref={(node) => {
                  if (node) {
                    inputs.current.set(row.key, node);
                    if (focusKey.current === row.key) {
                      node.focus();
                      node.select();
                      focusKey.current = null;
                    }
                  } else inputs.current.delete(row.key);
                }}
                aria-label={`Option ${index + 1}`}
                value={row.text}
                maxLength={MAX_LABEL_LENGTH}
                className="h-8"
                onChange={(event) => set(row.key, event.target.value)}
                onPaste={(event) => onPaste(event, row.key)}
              />
              <IconButton
                label="Move up"
                className="size-7"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp size={14} />
              </IconButton>
              <IconButton
                label="Move down"
                className="size-7"
                disabled={index === rows.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown size={14} />
              </IconButton>
              <IconButton
                label="Remove option"
                className="size-7"
                disabled={rows.length <= 1}
                onClick={() => push(rows.filter((r) => r.key !== row.key))}
              >
                <X size={14} />
              </IconButton>
            </li>
          ))}
        </ul>
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          disabled={rows.length >= MAX_OPTIONS}
          onClick={add}
        >
          <Plus size={14} aria-hidden="true" />
          Add option
        </Button>
        <p className="m-0 text-xs text-muted-foreground">
          Paste several lines to add many at once.
        </p>
      </PopoverContent>
    </Popover>
  );
}
