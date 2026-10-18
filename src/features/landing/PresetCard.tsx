import { FormThumbnail } from '@/features/forms/FormThumbnail';
import type { Template } from '@/templates';

export const PRESET_WIDTH = 210;
export const PRESET_HEIGHT = 270;

interface PresetCardProps {
  template: Template;
  onOpen: (template: Template) => void;
  /** Cards in the second copy of the loop are hidden from assistive tech and the tab order. */
  decorative?: boolean;
}

/** One preset form: a live picture and its name. Press it to see it larger. */
export function PresetCard({ template, onOpen, decorative = false }: PresetCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(template)}
      tabIndex={decorative ? -1 : 0}
      aria-hidden={decorative || undefined}
      className="block w-fit cursor-pointer overflow-hidden rounded-xl border border-border bg-card p-0 text-left shadow-md transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <FormThumbnail doc={template.doc} width={PRESET_WIDTH} height={PRESET_HEIGHT} />
      <span className="block border-t border-border px-3 py-2 text-sm font-medium text-foreground">
        {template.name}
        <span className="sr-only"> preset. Press to preview.</span>
      </span>
    </button>
  );
}
