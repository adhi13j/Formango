import { del } from 'idb-keyval';
import { useEffect, useState } from 'react';
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
import { DOC_KEY, loadSavedDoc } from '@/lib/persistence';
import { createFormsRepo } from '@/lib/repo/formsRepo';
import { hasContent } from '@/lib/submitButton';
import type { FormDoc } from '@/types/doc';

const DISMISSED_KEY = 'formango:handoff:dismissed';

function wasDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/** After login: offers to move a design made as a guest into the account. */
export function GuestHandoff() {
  const navigate = useNavigate();
  const [doc, setDoc] = useState<FormDoc | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (wasDismissed()) return;
    let cancelled = false;
    void loadSavedDoc().then((result) => {
      if (!cancelled && result.status === 'ok' && hasContent(result.doc)) setDoc(result.doc);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!doc) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Private mode: the offer may come back on the next visit, which is harmless.
    }
    setDoc(null);
  };

  const save = async () => {
    setBusy(true);
    const result = await createFormsRepo().create(doc);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    await del(DOC_KEY);
    navigate(`/forms/${result.value.id}/edit`);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && dismiss()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save your design to your account?</DialogTitle>
          <DialogDescription>
            You made “{doc.title}” before signing in. Save it here so you can publish it and keep it
            safe.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={dismiss}>
            Not now
          </Button>
          <Button disabled={busy} onClick={() => void save()}>
            Save to my account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
