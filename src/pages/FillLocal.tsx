import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Toaster } from 'sonner';
import { downloadPdf } from '@/pdf/downloadPdf';
import { FillForm } from '@/features/fill/FillForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fontsUsedBy, loadFonts } from '@/lib/fonts';
import { loadSavedDoc } from '@/lib/persistence';
import { createLocalResponsesRepo } from '@/lib/repo/responsesRepo';
import { usePageMeta } from '@/lib/usePageMeta';
import type { FormDoc } from '@/types/doc';

type State = { status: 'loading' } | { status: 'ready'; doc: FormDoc } | { status: 'none' };

/**
 * Fills the design saved in this browser and keeps the answers in this browser. It is how the
 * fill page can be tried before publishing exists (Phase 3 adds the shareable /f/:slug link).
 */
export default function FillLocal() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const repo = useMemo(() => createLocalResponsesRepo(), []);
  usePageMeta(state.status === 'ready' ? state.doc.title : 'Fill a form', { noindex: true });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await loadSavedDoc();
      if (result.status !== 'ok') return !cancelled && setState({ status: 'none' });
      await loadFonts(fontsUsedBy(result.doc));
      if (!cancelled) setState({ status: 'ready', doc: result.doc });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'none') {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">No form to fill yet</h1>
        <p className="text-muted-foreground">Design a form in the builder first, then come back.</p>
        <Button asChild>
          <Link to="/builder">Open the builder</Link>
        </Button>
      </main>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <Toaster position="bottom-center" />
      <main className="min-h-0 flex-1">
        {state.status === 'ready' ? (
          <FillForm
            doc={state.doc}
            repo={repo}
            onDownload={(answers) =>
              downloadPdf(state.doc, answers, 'filled').then(() => undefined)
            }
          />
        ) : (
          <div className="flex h-full justify-center bg-workspace p-8" aria-busy="true">
            <Skeleton className="h-[560px] w-[390px] max-w-full bg-card" />
          </div>
        )}
      </main>
      <footer className="border-t border-border bg-card py-2 text-center text-xs text-muted-foreground">
        Made with <Link to="/">Formango</Link>
      </footer>
    </div>
  );
}
