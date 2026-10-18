import { Ban, Check } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
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
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DEFAULT_PALETTE } from '@/lib/constants';
import { normalizeHex } from '@/lib/color';
import { FONT_IDS, FONTS, type FontId } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import { beginBatch, endBatch, type HistoryBatch } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';
import { MIXED, type Mixed } from './selection';

export function Separator() {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      className="mx-1 h-6 w-px flex-none bg-border-strong"
    />
  );
}

// ---- color ----------------------------------------------------------------------------------

interface ColorControlProps {
  label: string;
  value: string | null | Mixed;
  allowNone?: boolean;
  onChange: (hex: string | null) => void;
}

function Swatch({ value, className }: { value: string | null | Mixed; className?: string }) {
  const style =
    value === MIXED
      ? {
          background:
            'conic-gradient(var(--mango-500), var(--leaf-500), var(--selection), var(--guide), var(--mango-500))',
        }
      : value === null
        ? {
            background:
              'linear-gradient(135deg, var(--card) 45%, var(--berry-500) 45% 55%, var(--card) 55%)',
          }
        : { background: value };
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-5 rounded border border-border-strong', className)}
      style={style}
    />
  );
}

export function ColorControl({ label, value, allowNone = false, onChange }: ColorControlProps) {
  const [open, setOpen] = useState(false);
  const recent = useUiStore((s) => s.recentColors);
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState(false);
  const current = value === MIXED ? 'Mixed' : value === null ? 'None' : value;

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setDraft(typeof value === 'string' ? value : '');
      setInvalid(false);
    }
  };

  const choose = (hex: string | null) => {
    onChange(hex);
    if (hex) useUiStore.getState().pushRecentColor(hex);
  };
  const commitDraft = () => {
    if (draft.trim() === '') return;
    const hex = normalizeHex(draft);
    if (!hex) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setDraft(hex);
    choose(hex);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`${label}: ${current}`}>
              <Swatch value={value} />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-64 space-y-3" aria-label={label}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">{current}</span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {DEFAULT_PALETTE.map((color) => (
            <button
              key={color.hex}
              type="button"
              aria-label={color.name}
              aria-pressed={value === color.hex}
              title={color.name}
              onClick={() => choose(color.hex)}
              className={cn(
                'flex size-8 items-center justify-center rounded-md border border-border-strong',
                value === color.hex && 'ring-2 ring-ring ring-offset-2',
              )}
              style={{ background: color.hex }}
            >
              {value === color.hex && (
                <Check size={14} className="mix-blend-difference" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
        {recent.length > 0 && (
          <div>
            <p className="m-0 mb-1 text-xs font-medium text-muted-foreground">Recent</p>
            <div className="flex flex-wrap gap-1.5">
              {recent.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Recent color ${hex}`}
                  onClick={() => choose(hex)}
                  className="size-6 rounded border border-border-strong"
                  style={{ background: hex }}
                />
              ))}
            </div>
          </div>
        )}
        <div>
          <label
            htmlFor={`hex-${label}`}
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Hex color
          </label>
          <Input
            id={`hex-${label}`}
            value={draft}
            placeholder="#FF9F1C"
            maxLength={7}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? `hex-error-${label}` : undefined}
            onChange={(event) => {
              setDraft(event.target.value);
              setInvalid(false);
            }}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitDraft();
            }}
          />
          {invalid && (
            <p id={`hex-error-${label}`} className="m-0 mt-1 text-xs text-error">
              Use a color like #FF9F1C.
            </p>
          )}
        </div>
        {allowNone && (
          <Button variant="secondary" size="sm" className="w-full" onClick={() => choose(null)}>
            <Ban size={14} aria-hidden="true" />
            No fill
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ---- numbers --------------------------------------------------------------------------------

interface NumberFieldProps {
  label: string;
  value: number | Mixed;
  min: number;
  max: number;
  step?: number;
  width?: string;
  suffix?: string;
  onCommit: (value: number) => void;
}

/** Type a number and press Enter or leave the field. Arrow keys step (Shift steps by 10). */
export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  width = 'w-14',
  suffix,
  onCommit,
}: NumberFieldProps) {
  const display = value === MIXED ? '' : String(value);
  // null while the field is not being edited, so it always shows the real value.
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? display;

  const clampValue = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100));
  const commit = (input: string) => {
    const parsed = Number(input);
    if (input.trim() === '' || Number.isNaN(parsed)) return;
    const next = clampValue(parsed);
    if (next !== value) onCommit(next);
  };

  return (
    <label className="flex items-center gap-1 text-xs text-muted-foreground">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">{suffix ?? ''}</span>
      <Input
        aria-label={label}
        title={label}
        inputMode="decimal"
        value={text}
        placeholder={value === MIXED ? 'Mixed' : ''}
        className={cn('h-8 px-2 text-center text-sm', width)}
        onFocus={(event) => {
          setDraft(display);
          event.target.select();
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => {
          commit(event.target.value);
          setDraft(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commit(event.currentTarget.value);
          } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            const base = value === MIXED ? Number(text) || min : value;
            const amount = (event.shiftKey ? 10 : 1) * step * (event.key === 'ArrowUp' ? 1 : -1);
            const next = clampValue(base + amount);
            setDraft(String(next));
            onCommit(next);
          }
        }}
      />
    </label>
  );
}

// ---- fonts ----------------------------------------------------------------------------------

export function FontSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FontId | Mixed;
  onChange: (id: FontId) => void;
}) {
  return (
    <Select value={value === MIXED ? '' : value} onValueChange={(id) => onChange(id as FontId)}>
      <SelectTrigger aria-label={label} size="sm" className="w-40">
        <SelectValue placeholder="Mixed" />
      </SelectTrigger>
      <SelectContent>
        {FONT_IDS.map((id) => (
          <SelectItem key={id} value={id} style={{ fontFamily: `"${FONTS[id].family}"` }}>
            {FONTS[id].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---- slider in a popover (one undo step per drag) ---------------------------------------------

interface SliderPopoverProps {
  label: string;
  icon: ReactNode;
  value: number | Mixed;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}

export function SliderPopover({
  label,
  icon,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: SliderPopoverProps) {
  const batch = useRef<HistoryBatch | null>(null);
  const shown = value === MIXED ? min : value;
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${label}: ${value === MIXED ? 'Mixed' : format(value)}`}
            >
              {icon}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-60 space-y-3" aria-label={label}>
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-foreground">{label}</span>
          <span className="text-muted-foreground">{value === MIXED ? 'Mixed' : format(value)}</span>
        </div>
        <Slider
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={[shown]}
          onValueChange={([next]) => {
            if (next === undefined) return;
            batch.current ??= beginBatch();
            onChange(next);
          }}
          onValueCommit={() => {
            if (batch.current) endBatch(batch.current);
            batch.current = null;
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
