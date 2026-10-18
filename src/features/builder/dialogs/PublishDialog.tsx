import { Check, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { createFormsRepo } from '@/lib/repo/formsRepo';
import { useCloudStore } from '@/store/cloudStore';
import { useDocStore } from '@/store/docStore';

export function publicLink(slug: string, origin: string = window.location.origin): string {
  return `${origin}/f/${slug}`;
}

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Publish, copy the link, republish after edits, or close the form. */
export function PublishDialog({ open, onOpenChange }: PublishDialogProps) {
  const meta = useCloudStore((s) => s.meta);
  const doc = useDocStore((s) => s.doc);
  const [busy, setBusy] = useState<'publish' | 'unpublish' | null>(null);
  const [copied, setCopied] = useState(false);

  const publishedDoc = meta?.publishedDoc ?? null;
  const hasChanges = useMemo(
    () => publishedDoc !== null && JSON.stringify(publishedDoc) !== JSON.stringify(doc),
    [publishedDoc, doc],
  );

  if (!meta) return null;
  const link = meta.slug ? publicLink(meta.slug) : null;

  const publish = async () => {
    setBusy('publish');
    try {
      // The public copy is made from what is saved, so save pending edits first.
      const saved = await useCloudStore.getState().flush();
      if (!saved) {
        toast.error('Your latest changes are not saved yet. Fix that, then publish.');
        return;
      }
      const result = await createFormsRepo().publish(meta.formId);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      const record = result.value;
      useCloudStore.getState().setMeta({
        formId: record.id,
        published: record.published,
        slug: record.slug,
        formRev: record.formRev,
        publishedDoc: record.publishedDoc,
      });
      toast.success(
        meta.published ? 'Republished. The link now shows your latest design.' : 'Published.',
      );
    } finally {
      setBusy(null);
    }
  };

  const unpublish = async () => {
    setBusy('unpublish');
    try {
      const result = await createFormsRepo().unpublish(meta.formId);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      useCloudStore.getState().setMeta({ ...meta, published: false });
      toast.success('The form is closed. The link now says it is closed.');
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Select the link and copy it by hand.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{meta.published ? 'Your form is live' : 'Publish this form'}</DialogTitle>
          <DialogDescription>
            {meta.published
              ? 'Anyone with the link can fill it in. Responses appear in your account.'
              : 'Publishing makes a link anyone can open and fill in. Nobody can find it unless you share it.'}
          </DialogDescription>
        </DialogHeader>
        {meta.published && link && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                aria-label="Public link"
                readOnly
                value={link}
                onFocus={(e) => e.target.select()}
              />
              <Button variant="secondary" onClick={() => void copy()}>
                {copied ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  <Copy size={16} aria-hidden="true" />
                )}
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
            <a
              href={link}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-sm text-foreground underline"
            >
              <ExternalLink size={14} aria-hidden="true" />
              Open the form
            </a>
            {hasChanges && (
              <p role="status" className="m-0 rounded-md bg-warning-bg p-3 text-sm text-warning">
                You have unpublished changes. The link still shows the version from your last
                publish.
              </p>
            )}
          </div>
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          {meta.published ? (
            <Button variant="ghost" disabled={busy !== null} onClick={() => void unpublish()}>
              {busy === 'unpublish' && (
                <Loader2 size={16} aria-hidden="true" className="animate-spin" />
              )}
              Close the form
            </Button>
          ) : (
            <span />
          )}
          {(!meta.published || hasChanges) && (
            <Button disabled={busy !== null} onClick={() => void publish()}>
              {busy === 'publish' && (
                <Loader2 size={16} aria-hidden="true" className="animate-spin" />
              )}
              {meta.published ? 'Republish' : 'Publish'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
