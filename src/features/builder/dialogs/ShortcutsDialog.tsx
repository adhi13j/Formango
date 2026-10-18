import { Kbd } from '@/components/common/Kbd';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUiStore } from '@/store/uiStore';
import { SHORTCUTS, formatKey, type ShortcutGroup } from '../shortcuts';

const GROUPS: ShortcutGroup[] = ['Edit', 'Selection', 'Arrange', 'View', 'Help'];

export function ShortcutsDialog() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Shortcuts work when you are not typing in a box.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-2">
          {GROUPS.map((group) => (
            <section key={group}>
              <h3 className="mb-2 text-sm font-bold text-foreground">{group}</h3>
              <ul className="m-0 list-none space-y-1.5 p-0">
                {SHORTCUTS.filter((s) => s.group === group).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="flex gap-1">
                      {s.keys.map((key) => (
                        <Kbd key={key}>{formatKey(key)}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
