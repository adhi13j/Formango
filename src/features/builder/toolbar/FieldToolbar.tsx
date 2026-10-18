import { PenLine, Palette } from 'lucide-react';
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
import { MAX_LABEL_LENGTH } from '@/lib/constants';
import { useDocStore } from '@/store/docStore';
import { isOptionList } from '@/lib/fields';
import type { FieldElement, FieldValidation } from '@/types/doc';
import { CommonActions } from './CommonActions';
import { ColorControl, FontSelect, NumberField } from './kit';
import { FileOptions } from './FileOptions';
import { OptionsEditor } from './OptionsEditor';
import { commonValue, patchAll, type OfType } from './selection';

function StylePopover({ els }: { els: FieldElement[] }) {
  const label = (patch: Partial<FieldElement['labelStyle']>) =>
    els.forEach((el) => patchOne(el, { labelStyle: { ...el.labelStyle, ...patch } }));
  const input = (patch: Partial<FieldElement['inputStyle']>) =>
    els.forEach((el) => patchOne(el, { inputStyle: { ...el.inputStyle, ...patch } }));
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" aria-label="Field style">
              <Palette size={18} aria-hidden="true" />
              Style
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Label and input style</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80 space-y-3" aria-label="Field style">
        <section className="space-y-2">
          <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Label
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <FontSelect
              label="Label font"
              value={commonValue(els, (el) => el.labelStyle.fontFamily)}
              onChange={(fontFamily) => label({ fontFamily })}
            />
            <NumberField
              label="Label size"
              value={commonValue(els, (el) => el.labelStyle.fontSize)}
              min={8}
              max={40}
              onCommit={(fontSize) => label({ fontSize })}
            />
            <ColorControl
              label="Label color"
              value={commonValue(els, (el) => el.labelStyle.color)}
              onChange={(hex) => hex && label({ color: hex })}
            />
          </div>
        </section>
        <section className="space-y-2">
          <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Input box
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <ColorControl
              label="Input fill"
              value={commonValue(els, (el) => el.inputStyle.fill)}
              onChange={(hex) => hex && input({ fill: hex })}
            />
            <ColorControl
              label="Border color"
              value={commonValue(els, (el) => el.inputStyle.stroke)}
              onChange={(hex) => hex && input({ stroke: hex })}
            />
            <ColorControl
              label="Text color"
              value={commonValue(els, (el) => el.inputStyle.textColor)}
              onChange={(hex) => hex && input({ textColor: hex })}
            />
            <NumberField
              label="Border width"
              suffix="Border"
              value={commonValue(els, (el) => el.inputStyle.strokeWidth)}
              min={0}
              max={20}
              onCommit={(strokeWidth) => input({ strokeWidth })}
            />
            <NumberField
              label="Corner radius"
              suffix="Radius"
              value={commonValue(els, (el) => el.inputStyle.radius)}
              min={0}
              max={50}
              onCommit={(radius) => input({ radius })}
            />
          </div>
        </section>
      </PopoverContent>
    </Popover>
  );
}

function patchOne(el: FieldElement, patch: Partial<FieldElement>): void {
  useDocStore.getState().updateElement(el.id, patch);
}

function PlaceholderPopover({ el }: { el: FieldElement }) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" aria-label="Placeholder">
              <PenLine size={18} aria-hidden="true" />
              Placeholder
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Hint shown inside the empty box</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72 space-y-2" aria-label="Placeholder">
        <label htmlFor="placeholder-text" className="text-sm font-bold text-foreground">
          Placeholder
        </label>
        <Input
          id="placeholder-text"
          key={el.id + el.placeholder}
          defaultValue={el.placeholder}
          maxLength={MAX_LABEL_LENGTH}
          placeholder="For example: Jane Doe"
          onBlur={(event) => patchOne(el, { placeholder: event.target.value })}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        />
      </PopoverContent>
    </Popover>
  );
}

export function FieldToolbar({ els }: { els: OfType<'field'>[] }) {
  const single = els.length === 1 ? els[0] : undefined;
  const required = commonValue(els, (el) => el.required);
  const types = new Set(els.map((el) => el.fieldType));
  const onlyType = types.size === 1 ? [...types][0] : undefined;
  return (
    <>
      {single && (
        <Input
          aria-label="Field label"
          key={single.id + single.label}
          defaultValue={single.label}
          maxLength={MAX_LABEL_LENGTH}
          className="h-8 w-44"
          onBlur={(event) =>
            event.target.value.trim() && patchOne(single, { label: event.target.value })
          }
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        />
      )}
      <label className="flex items-center gap-2 text-sm text-foreground">
        <Switch
          aria-label="Required"
          checked={required === true}
          onCheckedChange={(checked) => patchAll(els, { required: checked })}
        />
        Required
      </label>
      {single && (isOptionList(single.fieldType) || single.fieldType === 'dropdown') && (
        <OptionsEditor key={single.id} el={single} />
      )}
      {single?.fieldType === 'file' && <FileOptions el={single} />}
      {single && ['text', 'longtext', 'dropdown', 'file'].includes(single.fieldType) && (
        <PlaceholderPopover el={single} />
      )}
      {onlyType === 'text' && (
        <Select
          value={
            commonValue(els, (el) => el.validation) === 'none'
              ? 'none'
              : String(commonValue(els, (el) => el.validation))
          }
          onValueChange={(validation) =>
            patchAll(els, { validation: validation as FieldValidation })
          }
        >
          <SelectTrigger aria-label="Validation" size="sm" className="w-32">
            <SelectValue placeholder="Mixed" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Any text</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="number">Number</SelectItem>
          </SelectContent>
        </Select>
      )}
      <StylePopover els={els} />
      <CommonActions els={els} />
    </>
  );
}
