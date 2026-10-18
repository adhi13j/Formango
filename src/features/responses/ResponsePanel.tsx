import { Download, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { answerText, groupEntries } from '@/lib/answerText';
import type { ResponseRow } from '@/lib/repo/responsesRepo';
import type { FieldElement } from '@/types/doc';

interface ResponsePanelProps {
  response: ResponseRow | null;
  fields: FieldElement[];
  onClose: () => void;
  onDownloadPdf: (response: ResponseRow) => void;
  onDelete: (response: ResponseRow) => void;
  onOpenFile: (response: ResponseRow, field: FieldElement) => void;
}

/** A side panel with every answer of one response. Answers are shown as plain text. */
export function ResponsePanel({
  response,
  fields,
  onClose,
  onDownloadPdf,
  onDelete,
  onOpenFile,
}: ResponsePanelProps) {
  const known = new Set(fields.map((f) => f.id));
  const removed = response ? Object.keys(response.answers).filter((id) => !known.has(id)) : [];
  return (
    <Dialog open={response !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="fixed left-auto right-0 top-0 h-screen max-w-md translate-x-0 translate-y-0 overflow-y-auto rounded-none sm:max-w-md">
        {response && (
          <>
            <DialogHeader>
              <DialogTitle>Response</DialogTitle>
              <DialogDescription>{new Date(response.createdAt).toLocaleString()}</DialogDescription>
            </DialogHeader>
            <dl className="m-0 space-y-4">
              {fields.map((field) => {
                const value = response.answers[field.id];
                return (
                  <div key={field.id}>
                    <dt className="text-sm font-bold text-foreground">{field.label}</dt>
                    <dd className="m-0 mt-1 whitespace-pre-wrap break-words text-foreground">
                      {value === undefined ? (
                        <span className="text-muted-foreground">No answer</span>
                      ) : field.fieldType === 'signature' && typeof value === 'string' ? (
                        <img
                          src={value}
                          alt="Signature"
                          className="max-h-24 rounded-md border border-border bg-white p-1"
                        />
                      ) : field.fieldType === 'group' ? (
                        <ol className="m-0 list-none space-y-1 p-0">
                          {groupEntries(field, value).map((entry, index) => (
                            <li key={index} className="rounded-md bg-muted px-2 py-1 text-sm">
                              <strong>
                                {field.itemLabel} {index + 1}
                              </strong>
                              : {entry}
                            </li>
                          ))}
                        </ol>
                      ) : field.fieldType === 'file' ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onOpenFile(response, field)}
                        >
                          <ExternalLink size={14} aria-hidden="true" />
                          Open {answerText(field, value)}
                        </Button>
                      ) : (
                        answerText(field, value)
                      )}
                    </dd>
                  </div>
                );
              })}
              {removed.map((id) => (
                <div key={id}>
                  <dt className="text-sm font-bold text-muted-foreground">(removed field)</dt>
                  <dd className="m-0 mt-1 break-words text-foreground">
                    {Array.isArray(response.answers[id])
                      ? (response.answers[id] as string[]).join('; ')
                      : String(response.answers[id] ?? '')}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex gap-2">
              <Button onClick={() => onDownloadPdf(response)}>
                <Download size={16} aria-hidden="true" />
                Download PDF
              </Button>
              <Button variant="ghost" onClick={() => onDelete(response)}>
                <Trash2 size={16} aria-hidden="true" />
                Delete
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
