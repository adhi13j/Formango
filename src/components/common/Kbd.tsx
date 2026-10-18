import type { ReactNode } from 'react';

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border-strong bg-muted px-1.5 py-0.5 font-sans text-[11px] font-medium text-foreground">
      {children}
    </kbd>
  );
}
