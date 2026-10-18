import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormThumbnail } from '@/features/forms/FormThumbnail';
import { displayHeight } from '@/lib/geometry';
import type { Template } from '@/templates';

const PREVIEW_WIDTH = 320;

/** A read-only look at a preset with a button to start from it. */
export function PresetPreview({
  template,
  onClose,
  onUse,
}: {
  template: Template | null;
  onClose: () => void;
  onUse: (template: Template) => void;
}) {
  return (
    <Dialog open={template !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        {template && (
          <>
            <DialogHeader>
              <DialogTitle>{template.name}</DialogTitle>
              <DialogDescription>{template.description}</DialogDescription>
            </DialogHeader>
            <div className="mx-auto overflow-hidden rounded-md border border-border">
              <FormThumbnail
                doc={template.doc}
                width={PREVIEW_WIDTH}
                height={Math.round(
                  (displayHeight(template.doc) * PREVIEW_WIDTH) / template.doc.page.width,
                )}
              />
            </div>
            <DialogFooter>
              <Button onClick={() => onUse(template)}>Use this template</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
