import { ArrowDown, ArrowUp, ListPlus, Plus, Trash2 } from 'lucide-react';
import { IconButton } from '@/components/common/IconButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MAX_GROUP_COLUMNS, MAX_GROUP_ROWS, MAX_LABEL_LENGTH } from '@/lib/constants';
import { newColumn } from '@/lib/groups';
import { useDocStore } from '@/store/docStore';
import type { FieldElement, GroupColumn, GroupColumnType } from '@/types/doc';
import { NumberField } from './kit';

const TYPE_LABELS: Record<GroupColumnType, string> = {
  text: 'Short text',
  number: 'Number',
  date: 'Date',
  dropdown: 'Dropdown',
  radio: 'Single choice',
};

const hasOptions = (type: GroupColumnType) => type === 'dropdown' || type === 'radio';

function parseOptions(text: string): string[] {
  const seen = new Set<string>();
  for (const part of text.split(/[,\n]/)) {
    const option = part.trim().slice(0, MAX_LABEL_LENGTH);
    if (option) seen.add(option);
  }
  return [...seen];
}

function ColumnRow({
  column,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  column: GroupColumn;
  index: number;
  count: number;
  onChange: (patch: Partial<GroupColumn>) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const name = `question ${index + 1}`;
  return (
    <li className="space-y-2 rounded-lg border border-border p-2">
      <div className="flex items-center gap-1">
        <Input
          aria-label={`Label of ${name}`}
          key={column.id + column.label}
          defaultValue={column.label}
          maxLength={MAX_LABEL_LENGTH}
          className="h-8 min-w-0 flex-1"
          onBlur={(event) =>
            event.target.value.trim() && onChange({ label: event.target.value.trim() })
          }
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        />
        <IconButton label={`Move ${name} up`} disabled={index === 0} onClick={() => onMove(-1)}>
          <ArrowUp size={16} />
        </IconButton>
        <IconButton
          label={`Move ${name} down`}
          disabled={index === count - 1}
          onClick={() => onMove(1)}
        >
          <ArrowDown size={16} />
        </IconButton>
        <IconButton label={`Remove ${name}`} disabled={count <= 1} onClick={onRemove}>
          <Trash2 size={16} />
        </IconButton>
      </div>
      <div className="flex items-center gap-3">
        <Select
          value={column.type}
          onValueChange={(type) =>
            onChange({
              type: type as GroupColumnType,
              options:
                hasOptions(type as GroupColumnType) && column.options.length === 0
                  ? ['Option 1', 'Option 2']
                  : column.options,
            })
          }
        >
          <SelectTrigger aria-label={`Type of ${name}`} size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Switch
            aria-label={`${name} is required`}
            checked={column.required}
            onCheckedChange={(required) => onChange({ required })}
          />
          Required
        </label>
      </div>
      {hasOptions(column.type) && (
        <Input
          aria-label={`Choices of ${name}`}
          key={column.id + column.options.join(',')}
          defaultValue={column.options.join(', ')}
          placeholder="Living, Deceased"
          className="h-8"
          onBlur={(event) => {
            const options = parseOptions(event.target.value);
            if (options.length > 0) onChange({ options });
          }}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        />
      )}
    </li>
  );
}

/** The questions of a repeating group, the button text, and how many entries are allowed. */
export function GroupOptions({ el }: { el: FieldElement }) {
  const update = (patch: Partial<FieldElement>) =>
    useDocStore.getState().updateElement(el.id, patch);
  const setColumns = (columns: GroupColumn[]) => update({ columns });
  const change = (index: number, patch: Partial<GroupColumn>) =>
    setColumns(el.columns.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  const move = (index: number, by: -1 | 1) => {
    const next = [...el.columns];
    const [item] = next.splice(index, 1);
    if (item) next.splice(index + by, 0, item);
    setColumns(next);
  };
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" aria-label="Group questions">
              <ListPlus size={18} aria-hidden="true" />
              Questions
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>What each entry asks, and how many are allowed</TooltipContent>
      </Tooltip>
      <PopoverContent
        className="max-h-[70vh] w-96 space-y-3 overflow-y-auto"
        aria-label="Group questions"
      >
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-sm font-bold text-foreground">
            Entry name
            <Input
              key={el.itemLabel}
              defaultValue={el.itemLabel}
              maxLength={40}
              className="h-8 font-normal"
              onBlur={(event) =>
                event.target.value.trim() && update({ itemLabel: event.target.value.trim() })
              }
              onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
            />
          </label>
          <label className="space-y-1 text-sm font-bold text-foreground">
            Add button text
            <Input
              key={el.addLabel}
              defaultValue={el.addLabel}
              maxLength={40}
              className="h-8 font-normal"
              onBlur={(event) =>
                event.target.value.trim() && update({ addLabel: event.target.value.trim() })
              }
              onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-foreground">
          <span className="flex items-center gap-1">
            Fewest
            <NumberField
              label="Fewest entries"
              value={el.minRows}
              min={0}
              max={el.maxRows}
              onCommit={(minRows) => update({ minRows })}
            />
          </span>
          <span className="flex items-center gap-1">
            Most
            <NumberField
              label="Most entries"
              value={el.maxRows}
              min={Math.max(1, el.minRows)}
              max={MAX_GROUP_ROWS}
              onCommit={(maxRows) => update({ maxRows })}
            />
          </span>
          <label className="flex items-center gap-2">
            <Switch
              aria-label="Two questions side by side"
              checked={el.perRow === 2}
              onCheckedChange={(two) => update({ perRow: two ? 2 : 1 })}
            />
            Two per line
          </label>
        </div>
        <ul className="m-0 list-none space-y-2 p-0">
          {el.columns.map((column, index) => (
            <ColumnRow
              key={column.id}
              column={column}
              index={index}
              count={el.columns.length}
              onChange={(patch) => change(index, patch)}
              onMove={(by) => move(index, by)}
              onRemove={() => setColumns(el.columns.filter((_, i) => i !== index))}
            />
          ))}
        </ul>
        <Button
          variant="secondary"
          size="sm"
          disabled={el.columns.length >= MAX_GROUP_COLUMNS}
          onClick={() => setColumns([...el.columns, newColumn(el.columns)])}
        >
          <Plus size={16} aria-hidden="true" />
          Add question
        </Button>
      </PopoverContent>
    </Popover>
  );
}
