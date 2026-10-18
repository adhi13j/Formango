import { ElementView } from '@/components/elements/ElementView';
import type { AnswerValue } from '@/components/elements/types';
import { byReadingOrder } from '@/lib/geometry';
import { textContentHeight } from '@/lib/normalize';
import type { DocElement, FormDoc } from '@/types/doc';

const MIN_TEXT_SIZE = 14;
const GAP = 16;

interface ListViewProps {
  doc: FormDoc;
  width: number;
  mode: 'preview' | 'fill';
  answers: Record<string, AnswerValue>;
  errors?: Record<string, string> | undefined;
  onAnswer: (id: string, value: AnswerValue | undefined) => void;
}

/** One element laid out for a single column: full width, own height, positioned at the origin. */
function toColumn(el: DocElement, width: number): DocElement | null {
  switch (el.type) {
    case 'shape':
    case 'line':
      return null;
    case 'text': {
      const sized = { ...el, x: 0, y: 0, width, fontSize: Math.max(MIN_TEXT_SIZE, el.fontSize) };
      return { ...sized, height: textContentHeight(sized) };
    }
    case 'image':
      return {
        ...el,
        x: 0,
        y: 0,
        width,
        height: Math.round((el.height * width) / Math.max(1, el.width)),
      };
    case 'field':
      return { ...el, x: 0, y: 0, width };
    default: {
      const unreachable: never = el;
      return unreachable;
    }
  }
}

/** A4 forms on phones: the same elements, one per row, top to bottom. Shapes and lines are skipped. */
export function ListView({ doc, width, mode, answers, errors, onAnswer }: ListViewProps) {
  const column = [...doc.elements]
    .filter((el) => !el.hidden)
    .sort(byReadingOrder)
    .flatMap((el) => {
      const next = toColumn(el, width);
      return next ? [next] : [];
    });
  return (
    <div style={{ width, display: 'flex', flexDirection: 'column', gap: GAP }}>
      {column.map((el) => (
        <div
          key={el.id}
          style={{
            position: 'relative',
            width,
            height: el.height,
            marginBottom: errors?.[el.id] ? 28 : 0,
          }}
        >
          <ElementView
            el={el}
            mode={mode}
            value={answers[el.id]}
            error={errors?.[el.id]}
            onAnswer={onAnswer}
          />
        </div>
      ))}
    </div>
  );
}
