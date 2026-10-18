import { FONTS } from '@/lib/fonts';
import { layoutText } from '@/lib/text/layoutText';
import type { TextElement } from '@/types/doc';
import { fontStack } from './types';

interface TextViewProps {
  el: TextElement;
  editing?: boolean | undefined;
}

/** One block (h2 or p) with one span per layout line, so wrapping matches the PDF exactly. */
export function TextView({ el, editing }: TextViewProps) {
  const { lines, lineHeightPx } = layoutText({
    text: el.text,
    fontFamily: el.fontFamily,
    fontSize: el.fontSize,
    fontWeight: el.fontWeight,
    maxWidth: el.width,
    lineHeight: el.lineHeight,
  });
  const Tag = el.role === 'heading' ? 'h2' : 'p';
  return (
    <Tag
      className="doc-text m-0"
      style={{
        width: '100%',
        fontFamily: fontStack(FONTS[el.fontFamily].family),
        fontSize: el.fontSize,
        fontWeight: el.fontWeight,
        color: el.color,
        textAlign: el.align,
        lineHeight: `${lineHeightPx}px`,
        opacity: editing ? 0 : 1,
      }}
    >
      {lines.map((line, index) => (
        <span key={index} style={{ display: 'block', whiteSpace: 'pre', minHeight: lineHeightPx }}>
          {line}
        </span>
      ))}
    </Tag>
  );
}
