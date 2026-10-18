import { Grid3x3, MousePointerClick } from 'lucide-react';
import { IconButton } from '@/components/common/IconButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useDocStore } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';
import { SizeChip } from '../BottomBar';
import { ColorControl, Separator } from './kit';

function SubmitPopover() {
  const submit = useDocStore((s) => s.doc.page.submit);
  const setPage = useDocStore((s) => s.setPage);
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" aria-label="Submit button">
              <MousePointerClick size={18} aria-hidden="true" />
              Submit button
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Style the button people press to send the form</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72 space-y-3" aria-label="Submit button">
        <div className="space-y-1">
          <label htmlFor="submit-label" className="text-sm font-bold text-foreground">
            Button text
          </label>
          <Input
            id="submit-label"
            key={submit.label}
            defaultValue={submit.label}
            maxLength={30}
            onBlur={(event) =>
              event.target.value.trim() && setPage({ submit: { label: event.target.value.trim() } })
            }
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          Fill{' '}
          <ColorControl
            label="Button color"
            value={submit.fill}
            onChange={(hex) => hex && setPage({ submit: { fill: hex } })}
          />
          Text{' '}
          <ColorControl
            label="Button text color"
            value={submit.textColor}
            onChange={(hex) => hex && setPage({ submit: { textColor: hex } })}
          />
        </div>
        <p className="m-0 text-xs text-muted-foreground">
          The button appears below your content on the fill page.
        </p>
      </PopoverContent>
    </Popover>
  );
}

/** Shown when nothing is selected. */
export function PageSettings() {
  const page = useDocStore((s) => s.doc.page);
  const setPage = useDocStore((s) => s.setPage);
  const gridEnabled = useUiStore((s) => s.gridEnabled);
  return (
    <>
      <ColorControl
        label="Page color"
        value={page.background}
        onChange={(hex) => hex && setPage({ background: hex })}
      />
      <ColorControl
        label="Outer background"
        value={page.outerBackground}
        onChange={(hex) => hex && setPage({ outerBackground: hex })}
      />
      <Separator />
      <SizeChip />
      <IconButton
        label="Layout grid snap lines"
        pressed={gridEnabled}
        onClick={() => useUiStore.getState().setGridEnabled(!gridEnabled)}
      >
        <Grid3x3 size={20} strokeWidth={1.75} />
      </IconButton>
      <Separator />
      <SubmitPopover />
    </>
  );
}
