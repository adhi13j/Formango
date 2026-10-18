import { Plus, X } from 'lucide-react';
import { FONTS } from '@/lib/fonts';
import {
  GROUP_HEADER,
  cellField,
  layoutGroup,
  parseRows,
  splitCellId,
  stringifyRows,
} from '@/lib/groups';
import { fontStack, type AnswerValue, type ElementMode } from './types';
import { FieldView } from './FieldView';
import type { FieldElement } from '@/types/doc';

interface GroupViewProps {
  el: FieldElement;
  mode: ElementMode;
  value: AnswerValue | undefined;
  cellErrors: Record<string, string> | undefined;
  onAnswer: ((id: string, value: AnswerValue | undefined) => void) | undefined;
}

const smallButton =
  'inline-flex cursor-pointer items-center gap-1 rounded-md border-0 bg-transparent px-2 py-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring';

/**
 * A repeating group: a list of small forms ("Add person"). In the editor it shows one sample
 * entry. For respondents each entry has its own copy of the questions, a Remove button, and the
 * Add button below. Positions come from `layoutGroup`, which the PDF also uses.
 */
export function GroupView({ el, mode, value, cellErrors, onAnswer }: GroupViewProps) {
  const interactive = mode !== 'edit';
  const rows = interactive ? parseRows(value) : [];
  const count = interactive ? rows.length : Math.max(1, el.minRows);
  const layout = layoutGroup(el, count);
  const s = el.inputStyle;
  const ls = el.labelStyle;

  const write = (next: ReturnType<typeof parseRows>) =>
    onAnswer?.(el.id, next.length > 0 ? stringifyRows(next) : undefined);

  const onCell = (id: string, cellValue: AnswerValue | undefined) => {
    const target = splitCellId(id);
    if (!target) return;
    const next = rows.map((row) => ({ ...row }));
    const row = next[target.row];
    if (!row) return;
    if (typeof cellValue === 'string' && cellValue !== '') row[target.column] = cellValue;
    else delete row[target.column];
    write(next);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: interactive ? 'auto' : 'none' }}>
      {layout.rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          role="group"
          aria-label={`${el.itemLabel} ${rowIndex + 1}`}
          style={{
            position: 'absolute',
            left: 0,
            top: row.y,
            width: '100%',
            height: row.height,
            boxSizing: 'border-box',
            border: `1px solid ${s.stroke}`,
            borderRadius: s.radius + 4,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 12,
              right: 8,
              top: 0,
              height: GROUP_HEADER,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: fontStack(FONTS[ls.fontFamily].family),
              fontSize: ls.fontSize,
              fontWeight: ls.fontWeight,
              color: ls.color,
            }}
          >
            <span>
              {el.itemLabel} {rowIndex + 1}
            </span>
            {interactive && (
              <button
                type="button"
                className={smallButton}
                style={{ color: s.textColor }}
                aria-label={`Remove ${el.itemLabel} ${rowIndex + 1}`}
                onClick={() => write(rows.filter((_, index) => index !== rowIndex))}
              >
                <X size={14} aria-hidden="true" />
                Remove
              </button>
            )}
          </div>
          {row.cells.map((cell) => {
            const pseudo = cellField(el, rowIndex, cell);
            return (
              <div
                key={pseudo.id}
                data-cell-id={pseudo.id}
                style={{
                  position: 'absolute',
                  left: cell.x - 1,
                  top: cell.y - 1,
                  width: cell.width,
                  height: cell.height,
                }}
              >
                <FieldView
                  el={pseudo}
                  mode={mode}
                  value={interactive ? rows[rowIndex]?.[cell.column.id] : undefined}
                  error={cellErrors?.[pseudo.id]}
                  onAnswer={onCell}
                  editing={false}
                />
              </div>
            );
          })}
        </div>
      ))}
      {layout.addButton &&
        (interactive ? (
          <button
            type="button"
            onClick={() => write([...rows, {}])}
            style={{
              position: 'absolute',
              left: 0,
              top: layout.addButton.y,
              width: '100%',
              height: layout.addButton.height,
              boxSizing: 'border-box',
              border: `1px dashed ${s.stroke}`,
              borderRadius: s.radius,
              background: 'transparent',
              color: s.textColor,
              fontFamily: fontStack(FONTS[s.fontFamily].family),
              fontSize: s.fontSize,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
            className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Plus size={16} aria-hidden="true" />
            {el.addLabel}
          </button>
        ) : (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: layout.addButton.y,
              width: '100%',
              height: layout.addButton.height,
              boxSizing: 'border-box',
              border: `1px dashed ${s.stroke}`,
              borderRadius: s.radius,
              color: s.textColor,
              fontFamily: fontStack(FONTS[s.fontFamily].family),
              fontSize: s.fontSize,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Plus size={16} aria-hidden="true" />
            {el.addLabel}
          </div>
        ))}
    </div>
  );
}
