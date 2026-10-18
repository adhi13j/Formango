import { FieldToolbar } from './FieldToolbar';
import {
  AlignTools,
  ImageToolbar,
  LineToolbar,
  MultiToolbar,
  ShapeToolbar,
  TextToolbar,
} from './ElementToolbars';
import { PageSettings } from './PageSettings';
import { allOfType, useSelectedElements } from './selection';

function TypeToolbar({ els }: { els: ReturnType<typeof useSelectedElements> }) {
  if (allOfType(els, 'text')) return <TextToolbar els={els} />;
  if (allOfType(els, 'field')) return <FieldToolbar els={els} />;
  if (allOfType(els, 'shape')) return <ShapeToolbar els={els} />;
  if (allOfType(els, 'line')) return <LineToolbar els={els} />;
  if (allOfType(els, 'image')) return <ImageToolbar els={els} />;
  return <MultiToolbar els={els} />;
}

function Toolbar() {
  const els = useSelectedElements();
  if (els.length === 0) return <PageSettings />;
  return (
    <>
      {els.length > 1 && <AlignTools els={els} />}
      <TypeToolbar els={els} />
    </>
  );
}

/** 48px bar under the top bar. Its controls change with what is selected. */
export function ContextualToolbar() {
  return (
    <div
      role="toolbar"
      aria-label="Design tools"
      className="flex h-12 flex-none items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-border bg-card px-4"
    >
      <Toolbar />
    </div>
  );
}
