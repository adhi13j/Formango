import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnswerValue } from '@/components/elements/types';
import { cleanAnswers, errorOrder, validateAnswers, validateField } from '@/lib/answers';
import { clearAnswerFiles } from '@/lib/fileAnswers';
import { logError } from '@/lib/logError';
import type { ResponsesRepo } from '@/lib/repo/responsesRepo';
import type { Answers, FieldElement, FormDoc } from '@/types/doc';
import { FormView } from './FormView';
import { SuccessScreen } from './SuccessScreen';

/** Answers sent faster than this look like a bot, so ask the person to try again. */
export const MIN_FILL_MS = 2000;
const FOCUSABLE = 'input, select, textarea, button';

interface FillFormProps {
  doc: FormDoc;
  /** Where answers go. `null` in the builder's preview: submitting only shows the success screen. */
  repo: ResponsesRepo | null;
  /** Gives a PDF copy of the answers. Added to the success screen when present. */
  onDownload?: ((answers: Answers) => Promise<void>) | undefined;
}

type Status = 'filling' | 'sending' | 'done';

function withError(
  errors: Record<string, string>,
  id: string,
  message: string | null,
): Record<string, string> {
  if (message === null) {
    if (!(id in errors)) return errors;
    const { [id]: _removed, ...rest } = errors;
    return rest;
  }
  return errors[id] === message ? errors : { ...errors, [id]: message };
}

/**
 * The respondent experience: fill, validate, submit, and a success screen. Validation runs when a
 * field loses focus, again as the person types once a field has an error, and for every field on
 * submit (then the first error is focused).
 */
export function FillForm({ doc, repo, onDownload }: FillFormProps) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('filling');
  const [notice, setNotice] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [downloading, setDownloading] = useState(false);
  const answersRef = useRef<Record<string, AnswerValue>>({});
  const attempted = useRef(false);
  const startedAt = useRef(0);
  const honeypot = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const fields = useMemo(
    () =>
      new Map(doc.elements.flatMap((el) => (el.type === 'field' ? [[el.id, el] as const] : []))),
    [doc],
  );

  const onAnswer = useCallback(
    (id: string, value: AnswerValue | undefined) => {
      const next = { ...answersRef.current };
      if (value === undefined) delete next[id];
      else next[id] = value;
      answersRef.current = next;
      setAnswers(next);
      const field: FieldElement | undefined = fields.get(id);
      if (!field) return;
      // Once a field shows an error (or the person tried to submit), fix it as they type.
      setErrors((current) =>
        id in current || attempted.current
          ? withError(current, id, validateField(field, value))
          : current,
      );
    },
    [fields],
  );

  const focusField = (id: string) => {
    const node = rootRef.current?.querySelector<HTMLElement>(`[data-element-id="${id}"]`);
    if (!node) return;
    node.scrollIntoView({ block: 'center' });
    (node.querySelector<HTMLElement>(FOCUSABLE) ?? node).focus({ preventScroll: true });
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const holder = (event.target as HTMLElement).closest('[data-element-id]');
    const id = holder?.getAttribute('data-element-id');
    const field = id ? fields.get(id) : undefined;
    if (!id || !field) return;
    // Moving between the options of one radio group is not leaving the field.
    const next = event.relatedTarget as HTMLElement | null;
    if (next?.closest(`[data-element-id="${id}"]`)) return;
    setErrors((current) => withError(current, id, validateField(field, answersRef.current[id])));
  };

  const submit = async () => {
    if (status !== 'filling') return;
    setNotice(null);
    if (Date.now() - startedAt.current < MIN_FILL_MS) {
      setNotice('Please wait a moment, then press Submit again.');
      return;
    }
    attempted.current = true;
    const found = validateAnswers(doc, answersRef.current);
    setErrors(found);
    const order = errorOrder(doc, found);
    const first = order[0];
    if (first !== undefined) {
      setAnnouncement(
        `${order.length} ${order.length === 1 ? 'field needs' : 'fields need'} attention. ${found[first] ?? ''}`,
      );
      focusField(first);
      return;
    }
    // A filled hidden field means a bot: pretend it worked and keep nothing.
    if (honeypot.current?.value) {
      setStatus('done');
      return;
    }
    setStatus('sending');
    try {
      if (repo) await repo.create(cleanAnswers(doc, answersRef.current));
      setStatus('done');
    } catch (error) {
      logError('submitting a response', error);
      setStatus('filling');
      setNotice(
        "We couldn't save your response. Check your connection and press Submit again. Your answers are still here.",
      );
    }
  };

  // The button element keeps one stable callback, so submitting does not re-render every element.
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });
  const onSubmit = useCallback(() => void submitRef.current(), []);

  const reset = () => {
    answersRef.current = {};
    attempted.current = false;
    startedAt.current = Date.now();
    clearAnswerFiles();
    setAnswers({});
    setErrors({});
    setNotice(null);
    setAnnouncement('');
    setStatus('filling');
  };

  const download = onDownload
    ? async () => {
        setDownloading(true);
        try {
          await onDownload(cleanAnswers(doc, answersRef.current));
        } finally {
          setDownloading(false);
        }
      }
    : undefined;

  if (status === 'done') {
    return (
      <SuccessScreen
        doc={doc}
        preview={repo === null}
        onAnother={reset}
        onDownload={download ? () => void download() : undefined}
        downloading={downloading}
      />
    );
  }

  return (
    <div ref={rootRef} className="relative h-full w-full" onBlur={handleBlur}>
      <FormView
        doc={doc}
        mode="fill"
        answers={answers}
        errors={errors}
        onAnswer={onAnswer}
        onSubmit={onSubmit}
      />
      <input
        ref={honeypot}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: -9999, top: 0, width: 1, height: 1, opacity: 0 }}
      />
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {notice && (
        <div
          role="alert"
          className="absolute bottom-4 left-1/2 z-10 w-[min(92%,28rem)] -translate-x-1/2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground shadow-lg"
        >
          {notice}
        </div>
      )}
    </div>
  );
}
