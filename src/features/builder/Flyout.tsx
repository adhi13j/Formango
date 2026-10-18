import { X } from 'lucide-react';
import { IconButton } from '@/components/common/IconButton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUiStore, type RailItem } from '@/store/uiStore';
import { ElementsPanel } from './panels/ElementsPanel';
import { FieldsPanel } from './panels/FieldsPanel';
import { TemplatesPanel } from './panels/TemplatesPanel';
import { UploadsPanel } from './panels/UploadsPanel';

const TITLES: Record<RailItem, string> = {
  fields: 'Fields',
  elements: 'Elements',
  templates: 'Templates',
  uploads: 'Uploads',
};

/** 280px panel that overlays the workspace beside the rail. It never pushes the page. */
export function Flyout() {
  const active = useUiStore((s) => s.activeRail);
  const setActive = useUiStore((s) => s.setActiveRail);
  if (!active) return null;
  return (
    <aside
      aria-label={TITLES[active]}
      className="absolute inset-y-0 left-0 z-20 flex w-[280px] flex-col border-r border-border bg-card shadow-md"
    >
      <div className="flex h-12 flex-none items-center justify-between border-b border-border px-4">
        <h2 className="m-0 text-base font-bold text-foreground">{TITLES[active]}</h2>
        <IconButton label="Close panel" onClick={() => setActive(null)}>
          <X size={18} />
        </IconButton>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          {active === 'fields' && <FieldsPanel />}
          {active === 'elements' && <ElementsPanel />}
          {active === 'templates' && <TemplatesPanel />}
          {active === 'uploads' && <UploadsPanel />}
        </div>
      </ScrollArea>
    </aside>
  );
}
