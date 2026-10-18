import { FONTS } from '@/lib/fonts';
import type { ButtonElement } from '@/types/doc';
import { fontStack, type ElementMode } from './types';

interface ButtonViewProps {
  el: ButtonElement;
  mode: ElementMode;
  onSubmit: (() => void) | undefined;
}

/** The submit button. In the editor it is a picture of a button; in preview and fill it works. */
export function ButtonView({ el, mode, onSubmit }: ButtonViewProps) {
  const style = {
    width: '100%',
    height: '100%',
    background: el.fill,
    color: el.textColor,
    borderRadius: el.radius,
    fontFamily: fontStack(FONTS[el.fontFamily].family),
    fontSize: el.fontSize,
    fontWeight: el.fontWeight,
    border: 0,
    padding: '0 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    boxSizing: 'border-box',
  } as const;
  if (mode === 'edit') {
    return (
      <div className="doc-text" style={style}>
        {el.label}
      </div>
    );
  }
  return (
    <button
      type="button"
      className="doc-text cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      style={style}
      onClick={onSubmit}
    >
      {el.label}
    </button>
  );
}
