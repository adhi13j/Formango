import { useState } from 'react';
import { ElementView } from '@/components/elements/ElementView';
import { TEMPLATES, type Template } from '@/templates';
import { useDocStore } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';
import { ConfirmDialog } from '../dialogs/ConfirmDialog';
import { zoomToFit } from '../editorActions';

const THUMB_WIDTH = 248;
const THUMB_HEIGHT = 190;

/** A live miniature of the template, drawn with the same renderers as the page itself. */
function Thumbnail({ template }: { template: Template }) {
  const { page, elements } = template.doc;
  const scale = THUMB_WIDTH / page.width;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative overflow-hidden rounded-md border border-border"
      style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT, background: page.background }}
    >
      <div
        style={{
          position: 'absolute',
          width: page.width,
          height: page.height,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {elements.map((el) => (
          <ElementView key={el.id} el={el} mode="edit" />
        ))}
      </div>
    </div>
  );
}

export function TemplatesPanel() {
  const [pending, setPending] = useState<Template | null>(null);

  const apply = (template: Template) => {
    useDocStore.getState().replaceDoc(structuredClone(template.doc));
    useUiStore.getState().clearSelection();
    useUiStore.getState().setActiveRail(null);
    zoomToFit();
  };
  const choose = (template: Template) => {
    if (useDocStore.getState().doc.elements.length === 0) apply(template);
    else setPending(template);
  };

  return (
    <>
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {TEMPLATES.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              onClick={() => choose(template)}
              aria-label={`Use the ${template.name} template`}
              className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card p-2 text-left shadow-sm transition-colors hover:border-border-strong hover:bg-accent"
            >
              <Thumbnail template={template} />
              <span className="px-1">
                <span className="block text-sm font-medium text-foreground">{template.name}</span>
                <span className="block text-xs text-muted-foreground">{template.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={pending !== null}
        title="Replace current design?"
        description="The template replaces what is on the page. You can undo this right after."
        confirmLabel="Use template"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) apply(pending);
          setPending(null);
        }}
      />
    </>
  );
}
