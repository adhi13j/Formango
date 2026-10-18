import { CircleAlert } from 'lucide-react';
import { FONTS } from '@/lib/fonts';
import { inputTop, isOptionList, labelHeight } from '@/lib/fields';
import { measureText, truncateToWidth } from '@/lib/text/layoutText';
import type { FieldElement } from '@/types/doc';
import { FieldInput } from './FieldInputs';
import { fontStack, type AnswerValue, type ElementMode } from './types';

interface FieldViewProps {
  el: FieldElement;
  mode: ElementMode;
  value: AnswerValue | undefined;
  error: string | undefined;
  onAnswer: ((id: string, value: AnswerValue | undefined) => void) | undefined;
  editing: boolean | undefined;
}

export function FieldView({ el, mode, value, error, onAnswer, editing }: FieldViewProps) {
  const ls = el.labelStyle;
  const interactive = mode !== 'edit';
  const labelId = `lbl-${el.id}`;
  const inputId = `in-${el.id}`;
  const errorId = `err-${el.id}`;
  const showError = mode === 'fill' && Boolean(error);

  const asteriskWidth = el.required
    ? measureText(' *', ls.fontFamily, ls.fontSize, ls.fontWeight)
    : 0;
  const labelText = truncateToWidth(
    el.label,
    ls.fontFamily,
    ls.fontSize,
    ls.fontWeight,
    el.width - asteriskWidth,
  );
  const lineHeight = labelHeight(ls.fontSize);
  const top = inputTop(ls.fontSize);
  const useLabelTag = interactive && !isOptionList(el.fieldType) && el.fieldType !== 'signature';
  const Label = useLabelTag ? 'label' : 'div';

  return (
    <div className="doc-text" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Label
        id={labelId}
        {...(useLabelTag ? { htmlFor: inputId } : {})}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: lineHeight,
          lineHeight: `${lineHeight}px`,
          whiteSpace: 'pre',
          overflow: 'hidden',
          fontFamily: fontStack(FONTS[ls.fontFamily].family),
          fontSize: ls.fontSize,
          fontWeight: ls.fontWeight,
          color: ls.color,
          opacity: editing ? 0 : 1,
          pointerEvents: useLabelTag ? 'auto' : 'none',
        }}
      >
        {labelText}
        {el.required && (
          <span aria-hidden="true" className="text-destructive" style={{ whiteSpace: 'pre' }}>
            {' *'}
          </span>
        )}
      </Label>
      <div style={{ position: 'absolute', left: 0, right: 0, top, bottom: 0 }}>
        <FieldInput
          el={el}
          inputId={inputId}
          value={value}
          error={showError ? error : undefined}
          describedBy={showError ? errorId : undefined}
          interactive={interactive}
          onChange={(next) => onAnswer?.(el.id, next)}
        />
      </div>
      {showError && (
        <p
          id={errorId}
          className="m-0 flex items-start gap-1 text-sm text-error"
          style={{
            position: 'absolute',
            left: 0,
            top: '100%',
            marginTop: 4,
            width: '100%',
            pointerEvents: 'auto',
          }}
        >
          <CircleAlert size={16} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
