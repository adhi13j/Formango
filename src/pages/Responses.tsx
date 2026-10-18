import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Link2,
  Search,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast, Toaster } from 'sonner';
import { AppHeader } from '@/components/common/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/features/builder/dialogs/ConfirmDialog';
import { ResponsePanel } from '@/features/responses/ResponsePanel';
import { answerText } from '@/lib/answerText';
import { buildCsv, csvFileName } from '@/lib/csv';
import { downloadText } from '@/lib/download';
import { loadAllFonts } from '@/lib/fonts';
import { byReadingOrder } from '@/lib/geometry';
import { createFormsRepo, type FormRecord } from '@/lib/repo/formsRepo';
import { createResponsesAdmin, type ResponseRow } from '@/lib/repo/responsesRepo';
import { relativeTime } from '@/lib/relativeTime';
import { usePageMeta } from '@/lib/usePageMeta';
import { downloadPdf } from '@/pdf/downloadPdf';
import type { FieldElement } from '@/types/doc';

const PAGE_SIZE = 25;
const WEEK_MS = 7 * 24 * 3600 * 1000;
const PREVIEW_COLUMNS = 3;

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; form: FormRecord; rows: ResponseRow[]; total: number; lastWeek: number };

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="m-0 text-sm text-muted-foreground">{label}</p>
      <p className="m-0 mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

/** `/forms/:id/responses`: a table of answers with search, a side panel, PDF per response, and CSV. */
export default function Responses() {
  const { id = '' } = useParams();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [newestFirst, setNewestFirst] = useState(true);
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ResponseRow | null>(null);
  usePageMeta(load.status === 'ready' ? `Responses · ${load.form.title}` : 'Responses · Formango');

  const refresh = useCallback(async () => {
    const [form, list] = await Promise.all([
      createFormsRepo().get(id),
      createResponsesAdmin().list(id),
      loadAllFonts(),
    ]);
    if (!form.ok) return setLoad({ status: 'error', message: form.error.message });
    if (!list.ok) return setLoad({ status: 'error', message: list.error.message });
    const now = Date.now();
    const lastWeek = list.value.rows.filter(
      (r) => now - new Date(r.createdAt).getTime() < WEEK_MS,
    ).length;
    setLoad({
      status: 'ready',
      form: form.value,
      rows: list.value.rows,
      total: list.value.total,
      lastWeek,
    });
  }, [id]);

  useEffect(() => {
    // Fetching on arrival is the point of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const doc = load.status === 'ready' ? (load.form.publishedDoc ?? load.form.doc) : null;
  const fields = useMemo(
    () =>
      (doc?.elements ?? [])
        .filter((el): el is FieldElement => el.type === 'field')
        .sort(byReadingOrder),
    [doc],
  );
  const rows = useMemo(() => (load.status === 'ready' ? load.rows : []), [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? rows.filter((row) =>
          fields.some((f) => answerText(f, row.answers[f.id]).toLowerCase().includes(needle)),
        )
      : rows;
    return newestFirst ? matching : [...matching].reverse();
  }, [rows, fields, query, newestFirst]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const shown = visible.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const opened = rows.find((row) => row.id === openId) ?? null;

  if (load.status === 'loading') {
    return (
      <div className="min-h-screen bg-background" aria-busy="true">
        <AppHeader />
        <div className="mx-auto max-w-6xl space-y-4 p-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  if (load.status === 'error' || !doc) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-sm p-8 text-center">
          <p role="alert" className="text-foreground">
            {load.status === 'error' ? load.message : 'Nothing to show.'}
          </p>
          <Button onClick={() => void refresh()}>Try again</Button>
        </main>
      </div>
    );
  }

  const { form, total, lastWeek } = load;
  const latest = rows[0];
  const fileFieldIds = fields.filter((f) => f.fieldType === 'file').map((f) => f.id);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/forms">
                <ChevronLeft size={16} aria-hidden="true" />
                Forms
              </Link>
            </Button>
            <h1 className="m-0 flex-1 text-2xl font-bold text-foreground">{form.title}</h1>
            <Button
              variant="secondary"
              disabled={!form.slug || !form.published}
              onClick={() => {
                void navigator.clipboard
                  .writeText(`${window.location.origin}/f/${form.slug}`)
                  .then(() => toast.success('Link copied.'));
              }}
            >
              <Link2 size={16} aria-hidden="true" />
              Copy link
            </Button>
            <Button
              disabled={rows.length === 0}
              onClick={() =>
                downloadText(buildCsv(doc, rows), csvFileName(form.title), 'text/csv;charset=utf-8')
              }
            >
              <Download size={16} aria-hidden="true" />
              Export CSV
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Responses" value={String(total)} />
            <Metric label="Last 7 days" value={String(lastWeek)} />
            <Metric label="Latest" value={latest ? relativeTime(latest.createdAt) : 'None yet'} />
          </div>
          {total > rows.length && (
            <p className="m-0 text-sm text-muted-foreground">
              Showing the newest {rows.length} of {total} responses. The CSV has the same rows.
            </p>
          )}

          {rows.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center">
              <p className="mt-0 font-medium text-foreground">No responses yet</p>
              <p className="mb-0 text-muted-foreground">
                {form.published
                  ? 'Share your link and answers will appear here.'
                  : 'Publish the form to get a link people can fill in.'}
              </p>
            </div>
          ) : (
            <>
              <div className="relative max-w-sm">
                <Search
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-label="Search responses"
                  placeholder="Search answers"
                  className="pl-9"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(0);
                  }}
                />
              </div>
              <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th scope="col" className="p-3">
                        <button
                          type="button"
                          onClick={() => setNewestFirst((v) => !v)}
                          className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 font-bold text-foreground"
                        >
                          Submitted
                          {newestFirst ? (
                            <ArrowDown size={14} aria-label="newest first" />
                          ) : (
                            <ArrowUp size={14} aria-label="oldest first" />
                          )}
                        </button>
                      </th>
                      {fields.slice(0, PREVIEW_COLUMNS).map((f) => (
                        <th key={f.id} scope="col" className="p-3 font-bold text-foreground">
                          {f.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-border last:border-0 hover:bg-accent"
                      >
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => setOpenId(row.id)}
                            className="cursor-pointer border-0 bg-transparent p-0 text-left font-medium text-foreground underline"
                          >
                            {new Date(row.createdAt).toLocaleString()}
                          </button>
                        </td>
                        {fields.slice(0, PREVIEW_COLUMNS).map((f) => (
                          <td key={f.id} className="max-w-[16rem] truncate p-3 text-foreground">
                            {f.fieldType === 'signature'
                              ? '[signature]'
                              : answerText(f, row.answers[f.id])}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {shown.length === 0 && (
                      <tr>
                        <td
                          colSpan={PREVIEW_COLUMNS + 1}
                          className="p-6 text-center text-muted-foreground"
                        >
                          No responses match “{query}”.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Page {current + 1} of {pages}
                </span>
                <span className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={current === 0}
                    onClick={() => setPage(current - 1)}
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={current >= pages - 1}
                    onClick={() => setPage(current + 1)}
                  >
                    Next
                    <ChevronRight size={16} aria-hidden="true" />
                  </Button>
                </span>
              </div>
            </>
          )}
        </main>

        <ResponsePanel
          response={opened}
          fields={fields}
          onClose={() => setOpenId(null)}
          onDownloadPdf={(row) => void downloadPdf(doc, row.answers, 'filled')}
          onDelete={setToDelete}
          onOpenFile={(row, field) => {
            void createResponsesAdmin()
              .fileUrl(form.id, row.id, field.id)
              .then((url) =>
                url
                  ? window.open(url, '_blank', 'noopener')
                  : toast.error('That file is not available.'),
              );
          }}
        />
        <ConfirmDialog
          open={toDelete !== null}
          title="Delete this response?"
          description="This cannot be undone."
          confirmLabel="Delete"
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            const row = toDelete;
            setToDelete(null);
            if (!row) return;
            void createResponsesAdmin()
              .remove(form.id, row.id, fileFieldIds)
              .then(async (result) => {
                if (!result.ok) return toast.error(result.error.message);
                setOpenId(null);
                toast.success('Response deleted.');
                await refresh();
              });
          }}
        />
        <Toaster position="bottom-center" />
      </div>
    </TooltipProvider>
  );
}
