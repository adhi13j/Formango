import { ElementView } from '@/components/elements/ElementView';
import { displayHeight } from '@/lib/geometry';
import type { FormDoc } from '@/types/doc';

interface FormThumbnailProps {
  doc: FormDoc;
  width: number;
  /** Height of the crop. The top of the form is shown. */
  height: number;
}

/** A live, scaled picture of the form, drawn with the real renderers. It cannot be clicked into. */
export function FormThumbnail({ doc, width, height }: FormThumbnailProps) {
  const scale = width / doc.page.width;
  return (
    <div
      aria-hidden="true"
      inert
      className="relative overflow-hidden"
      style={{
        width,
        height,
        background: doc.page.background,
        pointerEvents: 'none',
        contain: 'strict',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: doc.page.width,
          height: displayHeight(doc),
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {doc.elements.map((el) => (
          <ElementView key={el.id} el={el} mode="edit" />
        ))}
      </div>
    </div>
  );
}
