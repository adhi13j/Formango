import { useLayoutEffect, useRef, useState } from 'react';
import { ElementView } from '@/components/elements/ElementView';
import type { AnswerValue } from '@/components/elements/types';
import { Button } from '@/components/ui/button';
import { byReadingOrder, displayHeight } from '@/lib/geometry';
import type { FormDoc } from '@/types/doc';
import { ListView } from './ListView';

export const PHONE_BREAKPOINT = 640;
const SUBMIT_HEIGHT = 48;
const SUBMIT_ZONE = 104;
const SIDE_GUTTER = 24;
const PHONE_SCALE_MIN = 0.85;
const PHONE_SCALE_MAX = 1.15;

interface FormViewProps {
  doc: FormDoc;
  mode: 'preview' | 'fill';
  answers: Record<string, AnswerValue>;
  errors?: Record<string, string> | undefined;
  onAnswer: (id: string, value: AnswerValue | undefined) => void;
  onSubmit?: (() => void) | undefined;
}

/**
 * What a respondent sees, used by preview and the fill page. It measures its own width: under
 * 640px it behaves like a phone (mobile forms scale to the screen, A4 forms become a list),
 * otherwise like a desktop (page centered on the outer background, scaled down if it is too wide).
 */
export function FormView({ doc, mode, answers, errors, onAnswer, onSubmit }: FormViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const measure = () => setWidth(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { page } = doc;
  const phone = width > 0 && width < PHONE_BREAKPOINT;
  const useList = phone && page.preset === 'a4';
  const submit = (
    <Button
      type="button"
      onClick={onSubmit}
      style={{ background: page.submit.fill, color: page.submit.textColor, height: SUBMIT_HEIGHT }}
      className="w-full text-base font-bold"
    >
      {page.submit.label}
    </Button>
  );

  let body: React.ReactNode = null;
  if (width > 0 && useList) {
    const listWidth = Math.min(width - 32, 560);
    body = (
      <div style={{ background: page.background, minHeight: '100%', paddingBottom: 96 }}>
        <div style={{ width: listWidth, margin: '0 auto', paddingTop: 24 }}>
          <ListView
            doc={doc}
            width={listWidth}
            mode={mode}
            answers={answers}
            errors={errors}
            onAnswer={onAnswer}
          />
        </div>
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            padding: `12px 16px calc(12px + env(safe-area-inset-bottom))`,
            background: page.background,
            borderTop: '1px solid var(--border)',
            marginTop: 24,
          }}
        >
          <div style={{ maxWidth: listWidth, margin: '0 auto' }}>{submit}</div>
        </div>
      </div>
    );
  } else if (width > 0) {
    const available = width - (phone ? 0 : SIDE_GUTTER * 2);
    const scale = phone
      ? Math.min(PHONE_SCALE_MAX, Math.max(PHONE_SCALE_MIN, available / page.width))
      : Math.min(1, available / page.width);
    const contentHeight = displayHeight(doc);
    const pageHeight = contentHeight + SUBMIT_ZONE;
    const ordered = [...doc.elements].sort(byReadingOrder);
    body = (
      <div style={{ padding: phone ? 0 : `${SIDE_GUTTER}px 0` }}>
        <div style={{ width: page.width * scale, height: pageHeight * scale, margin: '0 auto' }}>
          <div
            data-testid="fill-page"
            style={{
              position: 'relative',
              width: page.width,
              height: pageHeight,
              background: page.background,
              transform: `scale(${scale})`,
              transformOrigin: '0 0',
              boxShadow: phone ? 'none' : 'var(--shadow-page)',
            }}
          >
            {ordered.map((el) => (
              <ElementView
                key={el.id}
                el={el}
                mode={mode}
                value={answers[el.id]}
                error={errors?.[el.id]}
                onAnswer={onAnswer}
              />
            ))}
            <div
              style={{
                position: 'absolute',
                left: page.margin,
                top: contentHeight + 24,
                width: page.width - page.margin * 2,
              }}
            >
              {submit}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="h-full w-full overflow-auto"
      style={{ background: page.outerBackground }}
    >
      {body}
    </div>
  );
}
