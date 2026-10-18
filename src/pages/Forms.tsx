import { Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast, Toaster } from 'sonner';
import { AppHeader } from '@/components/common/AppHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/features/builder/dialogs/ConfirmDialog';
import { CARD_WIDTH, FormCard } from '@/features/forms/FormCard';
import { GuestHandoff } from '@/features/forms/GuestHandoff';
import { NewFormDialog } from '@/features/forms/NewFormDialog';
import { loadAllFonts } from '@/lib/fonts';
import { createFormsRepo, type FormSummary } from '@/lib/repo/formsRepo';
import { usePageMeta } from '@/lib/usePageMeta';

const UNDO_MS = 5000;

type Load = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

/** `/forms`: every form of the signed-in account, as a row of cards. */
export default function Forms() {
  usePageMeta('My forms · Formango');
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [newOpen, setNewOpen] = useState(false);
  const [toDelete, setToDelete] = useState<FormSummary | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const refresh = useCallback(async () => {
    const repo = createFormsRepo();
    const [list, responseCounts] = await Promise.all([
      repo.list(),
      repo.responseCounts(),
      loadAllFonts(),
    ]);
    if (!list.ok) {
      setLoad({ status: 'error', message: list.error.message });
      return;
    }
    setForms(list.value);
    setCounts(responseCounts);
    setLoad({ status: 'ready' });
  }, []);

  useEffect(() => {
    // Fetching on arrival is the point of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  // A delete still waiting for its undo window finishes if the page is left.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
    };
  }, []);

  const copyLink = async (form: FormSummary) => {
    if (!form.slug) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/f/${form.slug}`);
      toast.success('Link copied.');
    } catch {
      toast.error('Could not copy the link.');
    }
  };

  const duplicate = async (form: FormSummary) => {
    const result = await createFormsRepo().duplicate(form.id);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(`Copied “${form.title}”.`);
    await refresh();
  };

  /** Removes the card at once, and deletes for real after the undo window. */
  const remove = (form: FormSummary) => {
    setForms((current) => current.filter((f) => f.id !== form.id));
    const finish = async () => {
      timers.current.delete(form.id);
      const result = await createFormsRepo().remove(form.id);
      if (!result.ok) {
        toast.error(`${result.error.message} “${form.title}” was not deleted.`);
        await refresh();
      }
    };
    timers.current.set(
      form.id,
      setTimeout(() => void finish(), UNDO_MS),
    );
    toast(`Deleted “${form.title}”`, {
      duration: UNDO_MS,
      action: {
        label: 'Undo',
        onClick: () => {
          const timer = timers.current.get(form.id);
          if (timer) clearTimeout(timer);
          timers.current.delete(form.id);
          void refresh();
        },
      },
    });
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h1 className="m-0 text-2xl font-bold text-foreground">Your forms</h1>
            <Button onClick={() => setNewOpen(true)}>
              <Plus size={18} aria-hidden="true" />
              New form
            </Button>
          </div>

          {load.status === 'loading' && (
            <ul className="m-0 flex list-none gap-4 overflow-hidden p-0" aria-busy="true">
              {[0, 1, 2, 3].map((n) => (
                <Skeleton
                  key={n}
                  className="h-60 flex-none rounded-xl"
                  style={{ width: CARD_WIDTH }}
                />
              ))}
            </ul>
          )}

          {load.status === 'error' && (
            <div role="alert" className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="mt-0 text-foreground">{load.message}</p>
              <Button variant="secondary" onClick={() => void refresh()}>
                Try again
              </Button>
            </div>
          )}

          {load.status === 'ready' && (
            <>
              <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:flex sm:snap-x sm:overflow-x-auto sm:pb-4">
                <li className="flex-none snap-start" style={{ width: CARD_WIDTH }}>
                  <button
                    type="button"
                    onClick={() => setNewOpen(true)}
                    className="flex h-full min-h-60 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-strong bg-transparent text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <Plus size={28} aria-hidden="true" />
                    <span className="font-medium text-foreground">New form</span>
                  </button>
                </li>
                {forms.map((form) => (
                  <FormCard
                    key={form.id}
                    form={form}
                    responses={
                      form.published || counts[form.id] ? (counts[form.id] ?? 0) : undefined
                    }
                    onCopyLink={() => void copyLink(form)}
                    onDuplicate={() => void duplicate(form)}
                    onDelete={() => setToDelete(form)}
                  />
                ))}
              </ul>
              {forms.length === 0 && (
                <p className="mt-6 text-center text-muted-foreground">Create your first form</p>
              )}
            </>
          )}
        </main>
        <NewFormDialog open={newOpen} onOpenChange={setNewOpen} />
        <ConfirmDialog
          open={toDelete !== null}
          title={`Delete “${toDelete?.title ?? ''}”?`}
          description="The form and all its responses are removed. You can undo for a few seconds."
          confirmLabel="Delete"
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            if (toDelete) remove(toDelete);
            setToDelete(null);
          }}
        />
        <GuestHandoff />
        <Toaster position="bottom-center" />
      </div>
    </TooltipProvider>
  );
}
