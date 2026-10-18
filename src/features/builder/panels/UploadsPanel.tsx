import { ImagePlus } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createImageElement } from '@/lib/elements';
import { ImageError, prepareImage } from '@/lib/images';
import { useDocStore } from '@/store/docStore';
import { addPreparedElement } from '../addToPage';
import { setDragPayload } from '../dragData';

export function UploadsPanel() {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const elements = useDocStore((s) => s.doc.elements);

  const used = useMemo(() => {
    const seen = new Map<string, { src: string; width: number; height: number; alt: string }>();
    for (const el of elements) {
      if (el.type === 'image' && !seen.has(el.src)) {
        seen.set(el.src, { src: el.src, width: el.width, height: el.height, alt: el.alt });
      }
    }
    return [...seen.values()];
  }, [elements]);

  const addImage = (image: { src: string; width: number; height: number; alt?: string }) => {
    const { page } = useDocStore.getState().doc;
    addPreparedElement(
      'image',
      createImageElement(page, image.src, image.width, image.height, image.alt ?? ''),
    );
  };

  const onFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      addImage(await prepareImage(file));
    } catch (error) {
      toast.error(error instanceof ImageError ? error.message : "That image couldn't be added.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={() => input.current?.click()} disabled={busy}>
        <ImagePlus size={18} aria-hidden="true" />
        {busy ? 'Adding…' : 'Upload image'}
      </Button>
      <input
        ref={input}
        type="file"
        hidden
        data-testid="image-input"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => {
          void onFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <p className="m-0 text-xs text-muted-foreground">PNG, JPG or WebP, up to 5 MB.</p>
      {used.length === 0 ? (
        <p className="m-0 flex flex-col items-center gap-1 rounded-lg border border-dashed border-border-strong p-4 text-center text-sm text-muted-foreground">
          <ImagePlus size={24} aria-hidden="true" />
          Images you add show up here.
        </p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
          {used.map((image) => (
            <li key={image.src}>
              <button
                type="button"
                draggable
                aria-label={image.alt ? `Add image: ${image.alt}` : 'Add this image again'}
                onDragStart={(event) => setDragPayload(event, { image })}
                onClick={() => addImage(image)}
                className="block aspect-square w-full overflow-hidden rounded-md border border-border bg-muted hover:border-border-strong"
              >
                <img src={image.src} alt="" draggable={false} className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
