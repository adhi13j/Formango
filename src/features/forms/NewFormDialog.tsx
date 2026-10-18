import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PresetPicker } from '@/features/builder/dialogs/ChooseSizeDialog';
import { createFormsRepo } from '@/lib/repo/formsRepo';
import type { PagePreset } from '@/types/doc';
import { createBlankDoc } from '@/types/doc.schema';

/** Choose a size, create the form on the server, and open it in the builder. */
export function NewFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<PagePreset>('mobile');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    const result = await createFormsRepo().create(createBlankDoc(preset));
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    navigate(`/forms/${result.value.id}/edit`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose a size</DialogTitle>
          <DialogDescription>
            You can change this later from the bar at the bottom.
          </DialogDescription>
        </DialogHeader>
        <PresetPicker value={preset} onChange={setPreset} />
        <DialogFooter>
          <Button disabled={busy} onClick={() => void create()}>
            {busy && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
            Create form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
