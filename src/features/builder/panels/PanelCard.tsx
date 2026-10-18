import type { ReactNode } from 'react';
import type { NewElementKind } from '@/lib/elements';
import { addElementToPage } from '../addToPage';
import { setDragPayload } from '../dragData';

interface PanelCardProps {
  kind: NewElementKind;
  icon: ReactNode;
  title: string;
  hint?: string;
}

/** A button that adds an element on click, or drops it on the page when dragged. */
export function PanelCard({ kind, icon, title, hint }: PanelCardProps) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => setDragPayload(event, { kind })}
      onClick={() => addElementToPage(kind)}
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-colors hover:border-border-strong hover:bg-accent"
    >
      <span
        className="flex size-9 flex-none items-center justify-center rounded-md bg-muted text-mango-800"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </button>
  );
}
