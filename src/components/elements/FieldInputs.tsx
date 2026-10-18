import { Calendar, Check, ChevronDown } from 'lucide-react';
import type { CSSProperties } from 'react';
import { FIELD_ROW_HEIGHT } from '@/lib/constants';
import { FONTS } from '@/lib/fonts';
import { truncateToWidth } from '@/lib/text/layoutText';
import type { FieldElement, InputStyle } from '@/types/doc';
import { fontStack, type AnswerValue } from './types';

const PAD_X = 12;
const MARK_SIZE = 16;
const MARK_GAP = 10;

export function boxStyle(s: InputStyle): CSSProperties {
  return {
    boxSizing: 'border-box',
    background: s.fill,
    border: s.strokeWidth > 0 ? `${s.strokeWidth}px solid ${s.stroke}` : 'none',
    borderRadius: s.radius,
    color: s.textColor,
    fontFamily: fontStack(FONTS[s.fontFamily].family),
    fontSize: s.fontSize,
  };
}

const fill: CSSProperties = { width: '100%', height: '100%' };

interface InputProps {
  el: FieldElement;
  inputId: string;
  value: AnswerValue | undefined;
  error: string | undefined;
  describedBy: string | undefined;
  interactive: boolean;
  onChange: (value: AnswerValue | undefined) => void;
}

const textValue = (value: AnswerValue | undefined): string =>
  typeof value === 'string' ? value : '';
const orUndefined = (value: string): string | undefined => (value === '' ? undefined : value);

function Placeholder({ children }: { children: string }) {
  return (
    <span
      style={{ opacity: 0.55, whiteSpace: 'pre', overflow: 'hidden', textOverflow: 'ellipsis' }}
    >
      {children}
    </span>
  );
}

/** The inert look of text, long text, dropdown, date, and signature boxes in the editor. */
function EditBox({ el }: { el: FieldElement }) {
  const s = el.inputStyle;
  const isLong = el.fieldType === 'longtext';
  const isSignature = el.fieldType === 'signature';
  const hint =
    el.placeholder ||
    (el.fieldType === 'dropdown'
      ? 'Select an option'
      : el.fieldType === 'date'
        ? 'Select a date'
        : '');
  return (
    <div
      style={{
        ...fill,
        ...boxStyle(s),
        display: 'flex',
        alignItems: isLong || isSignature ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: isLong || isSignature ? PAD_X : `0 ${PAD_X}px`,
        overflow: 'hidden',
        ...(isSignature ? { borderStyle: 'dashed' } : null),
      }}
    >
      {isSignature ? <Placeholder>Sign here</Placeholder> : <Placeholder>{hint}</Placeholder>}
      {el.fieldType === 'dropdown' && (
        <ChevronDown size={16} aria-hidden="true" style={{ flex: 'none' }} />
      )}
      {el.fieldType === 'date' && (
        <Calendar size={16} aria-hidden="true" style={{ flex: 'none' }} />
      )}
    </div>
  );
}

function ChoiceMark({
  kind,
  checked,
  style,
}: {
  kind: 'radio' | 'checkbox';
  checked: boolean;
  style: InputStyle;
}) {
  const border = Math.max(1, style.strokeWidth);
  return (
    <span
      className="fm-choice-mark"
      aria-hidden="true"
      style={{
        position: 'relative',
        flex: 'none',
        width: MARK_SIZE,
        height: MARK_SIZE,
        boxSizing: 'border-box',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: style.fill,
        border: `${border}px solid ${style.stroke}`,
        borderRadius: kind === 'radio' ? '50%' : 4,
        color: style.textColor,
      }}
    >
      {checked && kind === 'radio' && (
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: style.textColor }} />
      )}
      {checked && kind === 'checkbox' && <Check size={12} strokeWidth={3} />}
    </span>
  );
}

/** Radio and checkbox option rows, 32px each. Real inputs in preview and fill. */
function ChoiceList({ el, interactive, value, describedBy, onChange }: InputProps) {
  const kind = el.fieldType === 'radio' ? 'radio' : 'checkbox';
  const s = el.inputStyle;
  const selected = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  const textWidth = el.width - MARK_SIZE - MARK_GAP;
  const toggle = (option: string, checked: boolean) => {
    if (kind === 'radio') return onChange(option);
    const next = checked ? [...selected, option] : selected.filter((o) => o !== option);
    onChange(next.length > 0 ? el.options.filter((o) => next.includes(o)) : undefined);
  };
  return (
    <div
      role={kind === 'radio' ? 'radiogroup' : 'group'}
      aria-labelledby={`lbl-${el.id}`}
      aria-required={el.required || undefined}
      aria-describedby={describedBy}
      style={{
        ...fill,
        color: s.textColor,
        fontFamily: fontStack(FONTS[s.fontFamily].family),
        fontSize: s.fontSize,
      }}
    >
      {el.options.map((option) => {
        const checked = selected.includes(option);
        return (
          <label
            key={option}
            className="fm-choice"
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: MARK_GAP,
              height: FIELD_ROW_HEIGHT,
              cursor: interactive ? 'pointer' : 'default',
              pointerEvents: interactive ? 'auto' : 'none',
            }}
          >
            {interactive && (
              <input
                className="fm-choice-input"
                type={kind}
                name={el.id}
                value={option}
                checked={checked}
                onChange={(event) => toggle(option, event.target.checked)}
              />
            )}
            <ChoiceMark kind={kind} checked={checked} style={s} />
            <span style={{ whiteSpace: 'pre' }}>
              {truncateToWidth(option, s.fontFamily, s.fontSize, 400, textWidth)}
            </span>
          </label>
        );
      })}
    </div>
  );
}

const INPUT_MODE: Record<FieldElement['validation'], 'text' | 'email' | 'tel' | 'decimal'> = {
  none: 'text',
  email: 'email',
  phone: 'tel',
  number: 'decimal',
};

/** The real, interactive control for text, long text, dropdown, and date. */
function RealControl({ el, inputId, value, error, describedBy, onChange }: InputProps) {
  const s = el.inputStyle;
  const common = {
    id: inputId,
    required: el.required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  } as const;
  const base: CSSProperties = { ...fill, ...boxStyle(s), margin: 0, outlineOffset: 2 };

  if (el.fieldType === 'longtext') {
    return (
      <textarea
        {...common}
        maxLength={2000}
        placeholder={el.placeholder}
        value={textValue(value)}
        onChange={(event) => onChange(orUndefined(event.target.value))}
        style={{ ...base, padding: PAD_X, resize: 'none', lineHeight: 1.3 }}
      />
    );
  }
  if (el.fieldType === 'dropdown') {
    return (
      <div style={{ position: 'relative', ...fill }}>
        <select
          {...common}
          value={textValue(value)}
          onChange={(event) => onChange(orUndefined(event.target.value))}
          style={{ ...base, appearance: 'none', padding: `0 ${PAD_X + 24}px 0 ${PAD_X}px` }}
        >
          <option value="">{el.placeholder || 'Select an option'}</option>
          {el.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: PAD_X,
            top: '50%',
            marginTop: -8,
            pointerEvents: 'none',
            color: s.textColor,
          }}
        />
      </div>
    );
  }
  if (el.fieldType === 'date') {
    return (
      <input
        {...common}
        type="date"
        value={textValue(value)}
        onChange={(event) => onChange(orUndefined(event.target.value))}
        style={{ ...base, padding: `0 ${PAD_X}px` }}
      />
    );
  }
  return (
    <input
      {...common}
      type="text"
      inputMode={INPUT_MODE[el.validation]}
      autoComplete="off"
      maxLength={200}
      placeholder={el.placeholder}
      value={textValue(value)}
      onChange={(event) => onChange(orUndefined(event.target.value))}
      style={{ ...base, padding: `0 ${PAD_X}px` }}
    />
  );
}

export function FieldInput(props: InputProps) {
  const { el, interactive } = props;
  if (el.fieldType === 'radio' || el.fieldType === 'checkbox') return <ChoiceList {...props} />;
  if (!interactive || el.fieldType === 'signature') return <EditBox el={el} />;
  return <RealControl {...props} />;
}
