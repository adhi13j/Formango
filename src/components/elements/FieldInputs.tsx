import { Calendar, Check, ChevronDown, FileText, Upload, X } from 'lucide-react';
import { useRef, useState, type CSSProperties } from 'react';
import { FIELD_MARK_GAP, FIELD_MARK_SIZE, FIELD_PAD_X, FIELD_ROW_HEIGHT } from '@/lib/constants';
import { acceptAttribute, checkFile, formatBytes } from '@/lib/fileTypes';
import { getAnswerFile, setAnswerFile } from '@/lib/fileAnswers';
import { FONTS } from '@/lib/fonts';
import { truncateToWidth } from '@/lib/text/layoutText';
import type { FieldElement, InputStyle } from '@/types/doc';
import { boxStyle, FILLED_STROKE } from './boxStyle';
import { SignaturePad } from './SignaturePad';
import { fontStack, type AnswerValue } from './types';

const PAD_X = FIELD_PAD_X;
const MARK_SIZE = FIELD_MARK_SIZE;
const MARK_GAP = FIELD_MARK_GAP;

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
  const isFile = el.fieldType === 'file';
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
        ...boxStyle(s, false, isSignature || isFile),
        display: 'flex',
        alignItems: isLong || isSignature ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: isLong || isSignature ? PAD_X : `0 ${PAD_X}px`,
        overflow: 'hidden',
      }}
    >
      {isSignature ? (
        <Placeholder>Draw, type, or upload your signature</Placeholder>
      ) : isFile ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Upload size={16} aria-hidden="true" style={{ flex: 'none', opacity: 0.8 }} />
          <Placeholder>{el.placeholder || 'Choose a file'}</Placeholder>
        </span>
      ) : (
        <Placeholder>{hint}</Placeholder>
      )}
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
  highlight,
}: {
  kind: 'radio' | 'checkbox';
  checked: boolean;
  style: InputStyle;
  /** Turn the border green when checked (preview and fill). */
  highlight: boolean;
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
        border: `${border}px solid ${checked && highlight ? FILLED_STROKE : style.stroke}`,
        transition: 'border-color 150ms ease',
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
            <ChoiceMark kind={kind} checked={checked} style={s} highlight={interactive} />
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
  const filled = value !== undefined && value !== '' && !error;
  const base: CSSProperties = { ...fill, ...boxStyle(s, filled), margin: 0, outlineOffset: 2 };

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

/** File upload: one button, then the chosen file with a remove button. */
function FileControl({ el, inputId, value, error, describedBy, onChange }: InputProps) {
  const s = el.inputStyle;
  const inputRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const name = typeof value === 'string' ? value : '';
  const file = name ? getAnswerFile(el.id) : undefined;
  const filled = name !== '' && !error;
  const shownError = problem ?? error;
  const pick = (picked: File | undefined) => {
    if (!picked) return;
    const message = checkFile(picked, el);
    setProblem(message);
    if (message) return;
    setAnswerFile(el.id, picked);
    onChange(picked.name);
  };
  const clear = () => {
    setProblem(null);
    setAnswerFile(el.id, undefined);
    onChange(undefined);
    if (inputRef.current) inputRef.current.value = '';
    inputRef.current?.focus();
  };
  return (
    <div style={{ position: 'relative', ...fill }}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="sr-only"
        accept={acceptAttribute(el)}
        required={el.required && !name}
        aria-invalid={shownError ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => pick(event.target.files?.[0])}
      />
      <div
        style={{
          ...fill,
          ...boxStyle(s, filled, !filled && !shownError),
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: `0 ${PAD_X}px`,
          overflow: 'hidden',
        }}
      >
        {name ? (
          <>
            <FileText size={18} aria-hidden="true" style={{ flex: 'none' }} />
            <span
              style={{
                flex: 1,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {name}
              {file && <span style={{ opacity: 0.6 }}>{`  ${formatBytes(file.size)}`}</span>}
            </span>
            <button
              type="button"
              aria-label={`Remove ${name}`}
              onClick={clear}
              className="inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-md bg-transparent focus-visible:outline-2 focus-visible:outline-ring"
              style={{ color: s.textColor, border: 0 }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </>
        ) : (
          <label
            htmlFor={inputId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              cursor: 'pointer',
              minWidth: 0,
            }}
          >
            <Upload size={18} aria-hidden="true" style={{ flex: 'none' }} />
            <span
              style={{
                flex: 1,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {el.placeholder || 'Choose a file'}
            </span>
          </label>
        )}
      </div>
      {problem && (
        <p
          role="alert"
          className="m-0 text-sm text-error"
          style={{ position: 'absolute', left: 0, top: '100%', marginTop: 4 }}
        >
          {problem}
        </p>
      )}
    </div>
  );
}

export function FieldInput(props: InputProps) {
  const { el, interactive } = props;
  if (el.fieldType === 'radio' || el.fieldType === 'checkbox') return <ChoiceList {...props} />;
  if (!interactive) return <EditBox el={el} />;
  if (el.fieldType === 'signature') {
    return (
      <SignaturePad
        el={el}
        inputId={props.inputId}
        value={typeof props.value === 'string' ? props.value : undefined}
        describedBy={props.describedBy}
        invalid={Boolean(props.error)}
        onChange={props.onChange}
      />
    );
  }
  if (el.fieldType === 'file') return <FileControl {...props} />;
  return <RealControl {...props} />;
}
