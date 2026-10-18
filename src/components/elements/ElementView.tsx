import { memo } from 'react';
import type { DocElement } from '@/types/doc';
import { ButtonView } from './ButtonView';
import { FieldView } from './FieldView';
import { ImageView } from './ImageView';
import { LineView } from './LineView';
import { ShapeView } from './ShapeView';
import { TextView } from './TextView';
import { rootStyle, type ElementViewProps } from './types';

function renderBody(props: ElementViewProps, el: DocElement) {
  switch (el.type) {
    case 'text':
      return <TextView el={el} editing={props.editing} />;
    case 'shape':
      return <ShapeView el={el} />;
    case 'line':
      return <LineView el={el} />;
    case 'image':
      return <ImageView el={el} />;
    case 'field':
      return (
        <FieldView
          el={el}
          mode={props.mode}
          value={props.value}
          error={props.error}
          onAnswer={props.onAnswer}
          editing={props.editing}
        />
      );
    case 'button':
      return <ButtonView el={el} mode={props.mode} onSubmit={props.onSubmit} />;
    default: {
      const unreachable: never = el;
      return unreachable;
    }
  }
}

/**
 * Draws one element. The same component serves the builder, preview, and fill page, so what you
 * design is what people fill in. It never reads a store: props in, JSX out.
 */
export const ElementView = memo(function ElementView(props: ElementViewProps) {
  const { el, mode } = props;
  if (el.hidden && mode !== 'edit') return null;
  const isEdit = mode === 'edit';
  return (
    <div
      data-element-id={el.id}
      data-element-type={el.type}
      style={{
        ...rootStyle(el),
        // Edit mode: the root takes every pointer event so the canvas can select and drag it.
        // Preview and fill: only the real controls inside receive events.
        pointerEvents: isEdit && !el.hidden ? 'auto' : 'none',
        ...(el.hidden ? { opacity: 0.3, outline: '1px dashed currentColor' } : null),
      }}
    >
      <div style={{ width: '100%', height: '100%', pointerEvents: isEdit ? 'none' : 'auto' }}>
        {renderBody(props, el)}
      </div>
    </div>
  );
});
