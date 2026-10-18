import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportJson, serializeDoc } from '@/lib/persistence';
import { downloadText } from '@/lib/download';
import { useDocStore } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 border-b border-border bg-warning-bg px-4 py-2 text-sm text-warning"
    >
      <TriangleAlert size={18} aria-hidden="true" className="flex-none" />
      {children}
    </div>
  );
}

/** Persistent banners for save failures and for a design that could not be restored. */
export function Banners() {
  const storageError = useUiStore((s) => s.storageError);
  const restoreBackup = useUiStore((s) => s.restoreBackup);
  return (
    <>
      {storageError && (
        <Banner>
          <span className="flex-1">
            Your design is not being saved. {storageError} Your work stays on this page until you
            close it.
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => exportJson(useDocStore.getState().doc)}
          >
            Download backup (JSON)
          </Button>
        </Banner>
      )}
      {restoreBackup && (
        <Banner>
          <span className="flex-1">
            We could not restore your last design. The saved data is still available.
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => downloadText(restoreBackup, 'saved-design-backup.json')}
          >
            Download saved data
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => useUiStore.getState().setRestoreBackup(null)}
          >
            Dismiss
          </Button>
        </Banner>
      )}
    </>
  );
}

export { serializeDoc };
