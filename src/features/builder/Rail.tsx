import { Image, LayoutTemplate, ListPlus, Shapes } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useUiStore, type RailItem } from '@/store/uiStore';

const ITEMS: { id: RailItem; label: string; icon: ReactNode }[] = [
  { id: 'fields', label: 'Fields', icon: <ListPlus size={22} strokeWidth={1.75} /> },
  { id: 'elements', label: 'Elements', icon: <Shapes size={22} strokeWidth={1.75} /> },
  { id: 'templates', label: 'Templates', icon: <LayoutTemplate size={22} strokeWidth={1.75} /> },
  { id: 'uploads', label: 'Uploads', icon: <Image size={22} strokeWidth={1.75} /> },
];

export function Rail() {
  const active = useUiStore((s) => s.activeRail);
  const toggle = useUiStore((s) => s.toggleRail);
  return (
    <nav
      aria-label="Add to page"
      className="flex w-[72px] flex-col items-center gap-1 border-r border-border bg-card py-2"
    >
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={active === item.id}
          onClick={() => toggle(item.id)}
          className={cn(
            'flex w-14 flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
            active === item.id && 'bg-accent text-accent-foreground',
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  );
}
