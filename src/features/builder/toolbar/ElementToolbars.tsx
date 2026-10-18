import {
  AlignCenter,
  AlignHorizontalDistributeCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignLeft,
  AlignRight,
  AlignVerticalDistributeCenter,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Blend,
  Bold,
  Heading,
  MessageSquareText,
  Minimize2,
  MoveVertical,
  Maximize2,
  Replace,
} from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import { IconButton } from '@/components/common/IconButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { COLORS } from '@/lib/constants';
import { ImageError, prepareImage } from '@/lib/images';
import type { AlignMode, Axis } from '@/lib/geometry';
import { alignSelection, distributeSelection } from '../editorActions';
import { CommonActions } from './CommonActions';
import { ColorControl, FontSelect, NumberField, Separator, SliderPopover } from './kit';
import { commonValue, patchAll, patchEach, MIXED, type OfType } from './selection';
import type { DocElement } from '@/types/doc';

export function TextToolbar({ els }: { els: OfType<'text'>[] }) {
  const bold = els.every((el) => el.fontWeight === 700);
  const isHeading = els.every((el) => el.role === 'heading');
  const align = commonValue(els, (el) => el.align);
  const alignments = [
    { value: 'left', label: 'Align left', icon: <AlignLeft size={20} strokeWidth={1.75} /> },
    { value: 'center', label: 'Align center', icon: <AlignCenter size={20} strokeWidth={1.75} /> },
    { value: 'right', label: 'Align right', icon: <AlignRight size={20} strokeWidth={1.75} /> },
  ] as const;
  return (
    <>
      <FontSelect
        label="Font"
        value={commonValue(els, (el) => el.fontFamily)}
        onChange={(fontFamily) => patchAll(els, { fontFamily })}
      />
      <NumberField
        label="Font size"
        value={commonValue(els, (el) => el.fontSize)}
        min={8}
        max={120}
        onCommit={(fontSize) => patchAll(els, { fontSize })}
      />
      <ColorControl
        label="Text color"
        value={commonValue(els, (el) => el.color)}
        onChange={(hex) => hex && patchAll(els, { color: hex })}
      />
      <IconButton
        label="Bold"
        pressed={bold}
        onClick={() => patchAll(els, { fontWeight: bold ? 400 : 700 })}
      >
        <Bold size={20} strokeWidth={1.75} />
      </IconButton>
      {alignments.map((a) => (
        <IconButton
          key={a.value}
          label={a.label}
          pressed={align === a.value}
          onClick={() => patchAll(els, { align: a.value })}
        >
          {a.icon}
        </IconButton>
      ))}
      <SliderPopover
        label="Line height"
        icon={<MoveVertical size={20} strokeWidth={1.75} />}
        value={commonValue(els, (el) => el.lineHeight)}
        min={1}
        max={2}
        step={0.05}
        format={(v) => v.toFixed(2)}
        onChange={(lineHeight) => patchAll(els, { lineHeight })}
      />
      <IconButton
        label={
          isHeading
            ? 'Marked as a heading for screen readers'
            : 'Mark as a heading for screen readers'
        }
        pressed={isHeading}
        onClick={() => patchAll(els, { role: isHeading ? 'body' : 'heading' })}
      >
        <Heading size={20} strokeWidth={1.75} />
      </IconButton>
      <CommonActions els={els} />
    </>
  );
}

export function ShapeToolbar({ els }: { els: OfType<'shape'>[] }) {
  const allRects = els.every((el) => el.shape === 'rect');
  return (
    <>
      <ColorControl
        label="Fill"
        allowNone
        value={commonValue(els, (el) => el.fill)}
        onChange={(fill) => patchAll(els, { fill })}
      />
      <ColorControl
        label="Border color"
        allowNone
        value={commonValue(els, (el) => el.stroke)}
        onChange={(stroke) => patchAll(els, { stroke })}
      />
      <NumberField
        label="Border width"
        suffix="Border"
        value={commonValue(els, (el) => el.strokeWidth)}
        min={0}
        max={20}
        onCommit={(strokeWidth) =>
          patchEach(els, (el) => ({
            strokeWidth,
            // A border needs a color: give a borderless shape the default ink when it gets one.
            ...(strokeWidth > 0 && el.type === 'shape' && el.stroke === null
              ? { stroke: COLORS.ink }
              : null),
          }))
        }
      />
      {allRects && (
        <NumberField
          label="Corner radius"
          suffix="Radius"
          value={commonValue(els, (el) => el.radius)}
          min={0}
          max={200}
          onCommit={(radius) => patchAll(els, { radius })}
        />
      )}
      <SliderPopover
        label="Opacity"
        icon={<Blend size={20} strokeWidth={1.75} />}
        value={commonValue(els, (el) => el.opacity)}
        min={0}
        max={1}
        step={0.01}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(opacity) => patchAll(els, { opacity })}
      />
      <CommonActions els={els} />
    </>
  );
}

export function LineToolbar({ els }: { els: OfType<'line'>[] }) {
  const style = commonValue(els, (el) => el.style);
  return (
    <>
      <ColorControl
        label="Line color"
        value={commonValue(els, (el) => el.color)}
        onChange={(hex) => hex && patchAll(els, { color: hex })}
      />
      <NumberField
        label="Thickness"
        suffix="Thickness"
        value={commonValue(els, (el) => el.thickness)}
        min={1}
        max={20}
        onCommit={(thickness) => patchAll(els, { thickness })}
      />
      <Button
        variant={style === 'solid' ? 'secondary' : 'ghost'}
        size="sm"
        aria-pressed={style === 'solid'}
        onClick={() => patchAll(els, { style: 'solid' })}
      >
        Solid
      </Button>
      <Button
        variant={style === 'dashed' ? 'secondary' : 'ghost'}
        size="sm"
        aria-pressed={style === 'dashed'}
        onClick={() => patchAll(els, { style: 'dashed' })}
      >
        Dashed
      </Button>
      <CommonActions els={els} />
    </>
  );
}

function AltTextPopover({ els }: { els: OfType<'image'>[] }) {
  const alt = commonValue(els, (el) => el.alt);
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" aria-label="Alt text">
              <MessageSquareText size={18} aria-hidden="true" />
              Alt text
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Describe the image for screen readers</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72 space-y-2" aria-label="Alt text">
        <label htmlFor="alt-text" className="text-sm font-bold text-foreground">
          Alt text
        </label>
        <Input
          id="alt-text"
          key={alt === MIXED ? 'mixed' : alt}
          defaultValue={alt === MIXED ? '' : alt}
          placeholder={alt === MIXED ? 'Mixed' : 'Describe the image'}
          maxLength={300}
          onBlur={(event) => patchAll(els, { alt: event.target.value })}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        />
      </PopoverContent>
    </Popover>
  );
}

export function ImageToolbar({ els }: { els: OfType<'image'>[] }) {
  const input = useRef<HTMLInputElement>(null);
  const fit = commonValue(els, (el) => el.fit);
  const replace = async (file: File | undefined) => {
    const target = els[0];
    if (!file || !target || els.length !== 1) return;
    try {
      const image = await prepareImage(file);
      patchAll(els, { src: image.src });
    } catch (error) {
      toast.error(error instanceof ImageError ? error.message : "That image couldn't be added.");
    }
  };
  return (
    <>
      {els.length === 1 && (
        <>
          <Button variant="ghost" size="sm" onClick={() => input.current?.click()}>
            <Replace size={18} aria-hidden="true" />
            Replace
          </Button>
          <input
            ref={input}
            type="file"
            hidden
            accept="image/png,image/jpeg,image/webp"
            data-testid="replace-image-input"
            onChange={(event) => {
              void replace(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </>
      )}
      <IconButton
        label="Fill the box (crop)"
        pressed={fit === 'cover'}
        onClick={() => patchAll(els, { fit: 'cover' })}
      >
        <Maximize2 size={20} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        label="Fit inside the box"
        pressed={fit === 'contain'}
        onClick={() => patchAll(els, { fit: 'contain' })}
      >
        <Minimize2 size={20} strokeWidth={1.75} />
      </IconButton>
      <NumberField
        label="Corner radius"
        suffix="Radius"
        value={commonValue(els, (el) => el.radius)}
        min={0}
        max={200}
        onCommit={(radius) => patchAll(els, { radius })}
      />
      <SliderPopover
        label="Opacity"
        icon={<Blend size={20} strokeWidth={1.75} />}
        value={commonValue(els, (el) => el.opacity)}
        min={0}
        max={1}
        step={0.01}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(opacity) => patchAll(els, { opacity })}
      />
      <AltTextPopover els={els} />
      <CommonActions els={els} />
    </>
  );
}

const ALIGNS: { mode: AlignMode; label: string; icon: React.ReactNode }[] = [
  {
    mode: 'left',
    label: 'Align left',
    icon: <AlignHorizontalJustifyStart size={20} strokeWidth={1.75} />,
  },
  {
    mode: 'center',
    label: 'Align centers horizontally',
    icon: <AlignHorizontalJustifyCenter size={20} strokeWidth={1.75} />,
  },
  {
    mode: 'right',
    label: 'Align right',
    icon: <AlignHorizontalJustifyEnd size={20} strokeWidth={1.75} />,
  },
  {
    mode: 'top',
    label: 'Align top',
    icon: <AlignVerticalJustifyStart size={20} strokeWidth={1.75} />,
  },
  {
    mode: 'middle',
    label: 'Align middles vertically',
    icon: <AlignVerticalJustifyCenter size={20} strokeWidth={1.75} />,
  },
  {
    mode: 'bottom',
    label: 'Align bottom',
    icon: <AlignVerticalJustifyEnd size={20} strokeWidth={1.75} />,
  },
];

/** Align and distribute, shown whenever more than one element is selected. */
export function AlignTools({ els }: { els: DocElement[] }) {
  const canDistribute = els.filter((el) => !el.locked).length >= 3;
  const distribute: { axis: Axis; label: string; icon: React.ReactNode }[] = [
    {
      axis: 'horizontal',
      label: 'Distribute horizontally',
      icon: <AlignHorizontalDistributeCenter size={20} strokeWidth={1.75} />,
    },
    {
      axis: 'vertical',
      label: 'Distribute vertically',
      icon: <AlignVerticalDistributeCenter size={20} strokeWidth={1.75} />,
    },
  ];
  return (
    <>
      {ALIGNS.map((a) => (
        <IconButton key={a.mode} label={a.label} onClick={() => alignSelection(a.mode)}>
          {a.icon}
        </IconButton>
      ))}
      {distribute.map((d) => (
        <IconButton
          key={d.axis}
          label={canDistribute ? d.label : `${d.label} (select 3 or more)`}
          disabled={!canDistribute}
          onClick={() => distributeSelection(d.axis)}
        >
          {d.icon}
        </IconButton>
      ))}
      <Separator />
    </>
  );
}

/** Mixed selections: only the controls every element type shares. */
export function MultiToolbar({ els }: { els: DocElement[] }) {
  return <CommonActions els={els} />;
}
