import { CircleCheck, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FormDoc } from '@/types/doc';

interface SuccessScreenProps {
  doc: FormDoc;
  /** In the builder's preview nothing is saved, and the message says so. */
  preview: boolean;
  onAnother: () => void;
  /** Present when a PDF copy can be downloaded. */
  onDownload?: (() => void) | undefined;
  downloading?: boolean | undefined;
}

/** Replaces the form after a successful submit. */
export function SuccessScreen({
  doc,
  preview,
  onAnother,
  onDownload,
  downloading = false,
}: SuccessScreenProps) {
  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-auto p-6"
      style={{ background: doc.page.outerBackground }}
    >
      <div className="w-full max-w-md rounded-2xl bg-card p-8 text-center shadow-lg">
        <CircleCheck size={48} aria-hidden="true" className="mx-auto text-success" />
        <h1 className="mb-2 mt-4 text-2xl font-bold text-foreground">
          {preview ? 'That worked' : 'Thanks, your response was recorded'}
        </h1>
        <p className="m-0 text-muted-foreground">
          {preview
            ? 'This is what people see after they send the form. Nothing was saved.'
            : 'You can keep a copy of your answers.'}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {onDownload && (
            <Button onClick={onDownload} disabled={downloading} size="lg">
              {downloading ? (
                <Loader2 size={18} aria-hidden="true" className="animate-spin" />
              ) : (
                <Download size={18} aria-hidden="true" />
              )}
              Download my copy (PDF)
            </Button>
          )}
          <Button variant="secondary" onClick={onAnother} size="lg">
            Submit another response
          </Button>
        </div>
      </div>
    </div>
  );
}
