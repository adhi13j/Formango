import { useDocStore } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';

const TYPE_NAMES = {
  text: 'text',
  shape: 'shape',
  line: 'line',
  image: 'image',
  field: 'field',
} as const;

/** Visually hidden live region: tells screen reader users what is selected. */
export function SelectionAnnouncer() {
  const selectedIds = useUiStore((s) => s.selectedIds);
  const elements = useDocStore((s) => s.doc.elements);
  const selected = elements.filter((el) => selectedIds.includes(el.id));
  let message = '';
  if (selected.length === 1 && selected[0]) {
    const el = selected[0];
    message = `Selected ${el.name}, ${TYPE_NAMES[el.type]}${el.locked ? ', locked' : ''}`;
  } else if (selected.length > 1) {
    message = `${selected.length} elements selected`;
  }
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      data-testid="selection-announcer"
    >
      {message}
    </div>
  );
}
