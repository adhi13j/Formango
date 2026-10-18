import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface IconButtonProps extends Omit<ComponentProps<typeof Button>, 'children' | 'size'> {
  /** Accessible name and tooltip text. */
  label: string;
  /** Shown in the tooltip, for example "Ctrl+Z". */
  shortcut?: string | undefined;
  pressed?: boolean | undefined;
  children: ReactNode;
}

/** Icon-only button. Always has an aria-label and a tooltip. */
export function IconButton({
  label,
  shortcut,
  pressed,
  children,
  variant = 'ghost',
  ...props
}: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={variant} size="icon" aria-label={label} aria-pressed={pressed} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut ? <span className="ml-2 opacity-70">{shortcut}</span> : null}
      </TooltipContent>
    </Tooltip>
  );
}
