import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { exportJson } from '@/lib/persistence';
import { useDocStore } from '@/store/docStore';

interface NewDesignDialogProps {
  open: boolean;
  /** Called after the person chose to continue to the size picker. */
  onContinue: () => void;
  onCancel: () => void;
}

/** Shown before "New design" when the page has content, so nothing is replaced by surprise. */
export function NewDesignDialog({ open, onContinue, onCancel }: NewDesignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save your current work first?</DialogTitle>
          <DialogDescription>
            Starting a new design replaces what is on the page. You can undo it right after, but a
            backup file is the safest way to keep this one.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:flex-wrap">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={onContinue}>
            Discard and start new
          </Button>
          <Button
            onClick={() => {
              exportJson(useDocStore.getState().doc);
              onContinue();
            }}
          >
            Download backup (JSON)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
