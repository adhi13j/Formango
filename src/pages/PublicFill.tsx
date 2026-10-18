import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FillForm } from '@/features/fill/FillForm';
import { FillPageFrame } from '@/features/fill/FillPageFrame';
import { fontsUsedBy, loadFonts } from '@/lib/fonts';
import { createFormsRepo, type PublishedForm } from '@/lib/repo/formsRepo';
import { createSupabaseResponsesRepo } from '@/lib/repo/responsesRepo';
import { isSupabaseConfigured } from '@/lib/supabase';
import { usePageMeta } from '@/lib/usePageMeta';
import { downloadPdf } from '@/pdf/downloadPdf';

type State =
  | { status: 'loading' }
  | { status: 'ready'; form: PublishedForm }
  | { status: 'closed' }
  | { status: 'error'; message: string };

/** `/f/:slug`: what a respondent opens. Reads only the published snapshot. */
export default function PublicFill() {
  const { slug = '' } = useParams();
  const [state, setState] = useState<State>({ status: 'loading' });
  usePageMeta(state.status === 'ready' ? state.form.title : 'Formango', { noindex: true });

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setState({ status: 'error', message: 'This form is not available right now.' });
      return;
    }
    setState({ status: 'loading' });
    const result = await createFormsRepo().getPublishedBySlug(slug);
    if (!result.ok) {
      setState(
        result.error.kind === 'not-found'
          ? { status: 'closed' }
          : { status: 'error', message: result.error.message },
      );
      return;
    }
    await loadFonts(fontsUsedBy(result.value.doc));
    setState({ status: 'ready', form: result.value });
  }, [slug]);

  useEffect(() => {
    // Loading starts from an effect on purpose: it fetches from the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const repo = useMemo(
    () =>
      state.status === 'ready'
        ? createSupabaseResponsesRepo({
            formId: state.form.id,
            formRev: state.form.formRev,
            fileFieldIds: state.form.doc.elements.flatMap((el) =>
              el.type === 'field' && el.fieldType === 'file' ? [el.id] : [],
            ),
          })
        : null,
    [state],
  );

  if (state.status === 'closed') {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">This form is closed</h1>
        <p className="text-muted-foreground">
          It is no longer taking answers, or the link is not right. Ask the person who sent it.
        </p>
        <Button asChild variant="secondary">
          <Link to="/">Go to Formango</Link>
        </Button>
      </main>
    );
  }
  if (state.status === 'error') {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">We could not open this form</h1>
        <p className="text-muted-foreground">{state.message}</p>
        <Button onClick={() => void load()}>Try again</Button>
      </main>
    );
  }
  return (
    <FillPageFrame>
      {state.status === 'ready' && repo ? (
        <FillForm
          doc={state.form.doc}
          repo={repo}
          onDownload={(answers) =>
            downloadPdf(state.form.doc, answers, 'filled').then(() => undefined)
          }
        />
      ) : (
        <div className="flex h-full justify-center bg-workspace p-8" aria-busy="true">
          <Skeleton className="h-[560px] w-[390px] max-w-full bg-card" />
        </div>
      )}
    </FillPageFrame>
  );
}
