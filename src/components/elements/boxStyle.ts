import type { CSSProperties } from 'react';
import { FONTS } from '@/lib/fonts';
import type { InputStyle } from '@/types/doc';
import { fontStack } from './types';

/** Border color of a box that has been filled in. Screen only: the PDF keeps the designed stroke. */
export const FILLED_STROKE = 'var(--leaf-500)';

export function boxStyle(s: InputStyle, filled = false, dashed = false): CSSProperties {
  const color = filled ? FILLED_STROKE : s.stroke;
  return {
    boxSizing: 'border-box',
    background: s.fill,
    border:
      s.strokeWidth > 0 ? `${s.strokeWidth}px ${dashed ? 'dashed' : 'solid'} ${color}` : 'none',
    // A box designed without a border still shows it is filled.
    boxShadow: filled && s.strokeWidth === 0 ? `inset 0 0 0 2px ${FILLED_STROKE}` : 'none',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
    borderRadius: s.radius,
    color: s.textColor,
    fontFamily: fontStack(FONTS[s.fontFamily].family),
    fontSize: s.fontSize,
  };
}
