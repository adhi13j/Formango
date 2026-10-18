import type { PDFFont } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import { formatDate } from '@/lib/answers';
import { FIELD_MARK_GAP, FIELD_MARK_SIZE, FIELD_PAD_X, FIELD_ROW_HEIGHT } from '@/lib/constants';
import { getAnswerFile } from '@/lib/fileAnswers';
import { describeFileRules, formatBytes } from '@/lib/fileTypes';
import { inputTop, isOptionList, labelHeight } from '@/lib/fields';
import { layoutText, measureText, truncateToWidth } from '@/lib/text/layoutText';
import { COLORS } from '@/lib/constants';
import { GROUP_HEADER, cellField, layoutGroup, parseRows } from '@/lib/groups';
import type { Answers, FieldElement } from '@/types/doc';
import type { PdfContext } from './context';
import { drawPictureContained } from './drawImage';
import { drawBox, pdfColor } from './drawShapes';
import { baselineIn, drawRun } from './drawText';
import { hexToRgb01, toPdfRect, toPdfY } from './units';

const SIGNATURE_PADDING = 8;
const CHECK_POINTS: [number, number][] = [
  [12, 5],
  [6.5, 10.5],
  [4, 8],
];

type Value = Answers[string] | undefined;

const asText = (value: Value): string => (typeof value === 'string' ? value : '');
const asList = (value: Value): string[] =>
  Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];

function drawStroke(
  ctx: PdfContext,
  from: [number, number],
  to: [number, number],
  widthPx: number,
  hex: string,
): void {
  const { g } = ctx;
  ctx.page.drawLine({
    start: { x: from[0] * g.scale, y: toPdfY(g, from[1]) },
    end: { x: to[0] * g.scale, y: toPdfY(g, to[1]) },
    thickness: widthPx * g.scale,
    color: pdfColor(hex),
    lineCap: 1,
  });
}

async function drawLabel(ctx: PdfContext, el: FieldElement): Promise<void> {
  const ls = el.labelStyle;
  const asterisk = el.required ? measureText(' *', ls.fontFamily, ls.fontSize, ls.fontWeight) : 0;
  const text = truncateToWidth(
    el.label,
    ls.fontFamily,
    ls.fontSize,
    ls.fontWeight,
    el.width - asterisk,
  );
  const baseline = baselineIn(
    el.y,
    labelHeight(ls.fontSize),
    ls.fontFamily,
    ls.fontSize,
    ls.fontWeight,
  );
  await drawRun(ctx, {
    text,
    x: el.x,
    baseline,
    fontId: ls.fontFamily,
    weight: ls.fontWeight,
    size: ls.fontSize,
    color: ls.color,
  });
  if (el.required) {
    const used = measureText(text, ls.fontFamily, ls.fontSize, ls.fontWeight);
    await drawRun(ctx, {
      text: ' *',
      x: el.x + used,
      baseline,
      fontId: ls.fontFamily,
      weight: ls.fontWeight,
      size: ls.fontSize,
      color: COLORS.berry,
    });
  }
}

/** The input box: fill, border, and corners from the field's style. */
function boxRect(el: FieldElement) {
  const top = inputTop(el.labelStyle.fontSize);
  return { x: el.x, y: el.y + top, width: el.width, height: el.height - top };
}

function drawInputBox(ctx: PdfContext, el: FieldElement, dashed = false): void {
  const s = el.inputStyle;
  drawBox(ctx, {
    rect: boxRect(el),
    fill: s.fill,
    stroke: s.strokeWidth > 0 ? s.stroke : null,
    strokeWidth: s.strokeWidth,
    radius: s.radius,
    ...(dashed ? { dash: [4, 3] as [number, number] } : {}),
  });
}

/** One line of text vertically centered in the input box, cut with an ellipsis if too long. */
async function drawBoxText(
  ctx: PdfContext,
  el: FieldElement,
  text: string,
  rightPadding: number,
): Promise<void> {
  if (!text) return;
  const s = el.inputStyle;
  const box = boxRect(el);
  const left = FIELD_PAD_X + s.strokeWidth;
  const available = box.width - left - rightPadding - s.strokeWidth;
  const shown = truncateToWidth(text, s.fontFamily, s.fontSize, 400, available);
  await drawRun(ctx, {
    text: shown,
    x: box.x + left,
    baseline: baselineIn(box.y, box.height, s.fontFamily, s.fontSize, 400),
    fontId: s.fontFamily,
    weight: 400,
    size: s.fontSize,
    color: s.textColor,
  });
}

function drawChevron(ctx: PdfContext, el: FieldElement): void {
  const box = boxRect(el);
  const left = el.x + el.width - FIELD_PAD_X - 16;
  const top = box.y + box.height / 2 - 8;
  const point = (x: number, y: number): [number, number] => [left + x, top + y];
  const hex = el.inputStyle.textColor;
  drawStroke(ctx, point(4, 6), point(8, 10), 1.33, hex);
  drawStroke(ctx, point(8, 10), point(12, 6), 1.33, hex);
}

async function drawLongText(ctx: PdfContext, el: FieldElement, text: string): Promise<void> {
  if (!text) return;
  const s = el.inputStyle;
  const box = boxRect(el);
  const inset = s.strokeWidth + FIELD_PAD_X;
  const lineHeight = 1.3;
  const maxLines = Math.max(1, Math.floor((box.height - inset * 2) / (s.fontSize * lineHeight)));
  const { lines, lineHeightPx } = layoutText({
    text,
    fontFamily: s.fontFamily,
    fontSize: s.fontSize,
    fontWeight: 400,
    maxWidth: box.width - inset * 2,
    lineHeight,
    maxLines,
  });
  for (const [index, line] of lines.entries()) {
    await drawRun(ctx, {
      text: line,
      x: box.x + inset,
      baseline: baselineIn(
        box.y + inset + index * lineHeightPx,
        lineHeightPx,
        s.fontFamily,
        s.fontSize,
        400,
      ),
      fontId: s.fontFamily,
      weight: 400,
      size: s.fontSize,
      color: s.textColor,
    });
  }
}

function drawCheckMark(ctx: PdfContext, el: FieldElement, left: number, top: number): void {
  const hex = el.inputStyle.textColor;
  const at = ([x, y]: [number, number]): [number, number] => [left + x, top + y];
  const [a, b, c] = CHECK_POINTS;
  if (!a || !b || !c) return;
  drawStroke(ctx, at(a), at(b), 1.5, hex);
  drawStroke(ctx, at(b), at(c), 1.5, hex);
}

/** Radio and checkbox: one 32px row per option, with a drawn mark and the option text. */
async function drawChoices(ctx: PdfContext, el: FieldElement, selected: string[]): Promise<void> {
  const s = el.inputStyle;
  const kind = el.fieldType === 'radio' ? 'radio' : 'checkbox';
  const markBorder = Math.max(1, s.strokeWidth);
  const top = el.y + inputTop(el.labelStyle.fontSize);
  for (const [index, option] of el.options.entries()) {
    const rowTop = top + index * FIELD_ROW_HEIGHT;
    const markTop = rowTop + (FIELD_ROW_HEIGHT - FIELD_MARK_SIZE) / 2;
    const rect = { x: el.x, y: markTop, width: FIELD_MARK_SIZE, height: FIELD_MARK_SIZE };
    // In fillable PDFs the form widget draws its own mark (a square, since widgets cannot round).
    if (ctx.mode === 'filled') {
      drawBox(ctx, {
        rect,
        fill: s.fill,
        stroke: s.stroke,
        strokeWidth: markBorder,
        radius: kind === 'radio' ? FIELD_MARK_SIZE / 2 : 4,
        ellipse: kind === 'radio',
      });
    }
    if (ctx.mode === 'filled' && selected.includes(option)) {
      if (kind === 'radio') {
        drawBox(ctx, {
          rect: { x: el.x + 4, y: markTop + 4, width: 8, height: 8 },
          fill: s.textColor,
          stroke: null,
          strokeWidth: 0,
          radius: 4,
          ellipse: true,
        });
      } else {
        drawCheckMark(ctx, el, el.x, markTop);
      }
    }
    const textWidth = el.width - FIELD_MARK_SIZE - FIELD_MARK_GAP;
    await drawRun(ctx, {
      text: truncateToWidth(option, s.fontFamily, s.fontSize, 400, textWidth),
      x: el.x + FIELD_MARK_SIZE + FIELD_MARK_GAP,
      baseline: baselineIn(rowTop, FIELD_ROW_HEIGHT, s.fontFamily, s.fontSize, 400),
      fontId: s.fontFamily,
      weight: 400,
      size: s.fontSize,
      color: s.textColor,
    });
  }
}

async function drawMutedHint(ctx: PdfContext, el: FieldElement, full: string): Promise<void> {
  const s = el.inputStyle;
  const box = boxRect(el);
  const text = truncateToWidth(full, s.fontFamily, s.fontSize, 400, box.width - FIELD_PAD_X * 2);
  const width = measureText(text, s.fontFamily, s.fontSize, 400);
  await drawRun(ctx, {
    text,
    x: box.x + (box.width - width) / 2,
    baseline: baselineIn(box.y, box.height, s.fontFamily, s.fontSize, 400),
    fontId: s.fontFamily,
    weight: 400,
    size: s.fontSize,
    color: s.textColor,
    opacity: 0.5,
  });
}

// ---- fillable mode ----------------------------------------------------------------------------

function widgetRect(
  ctx: PdfContext,
  rect: { x: number; y: number; width: number; height: number },
) {
  return toPdfRect(ctx.g, rect);
}

async function addFillableWidgets(ctx: PdfContext, el: FieldElement): Promise<void> {
  const form = ctx.form;
  if (!form) return;
  const s = el.inputStyle;
  const font: PDFFont = await ctx.fonts.get(s.fontFamily, 400);
  const box = boxRect(el);
  const inset = s.strokeWidth + 2;
  const inner = {
    x: box.x + inset,
    y: box.y + inset,
    width: box.width - inset * 2,
    height: box.height - inset * 2,
  };
  const [tr, tg, tb] = hexToRgb01(s.textColor);
  const plain = { borderWidth: 0, textColor: rgb(tr, tg, tb) };
  const markLook = {
    borderWidth: Math.max(1, s.strokeWidth) * ctx.g.scale,
    borderColor: pdfColor(s.stroke),
    backgroundColor: pdfColor(s.fill),
  };
  const size = s.fontSize * ctx.g.scale;

  switch (el.fieldType) {
    case 'text':
    case 'date':
    case 'longtext': {
      const field = form.createTextField(el.key);
      if (el.fieldType === 'longtext') field.enableMultiline();
      field.addToPage(ctx.page, { ...widgetRect(ctx, inner), ...plain, font });
      field.setFontSize(size); // needs the default appearance that addToPage creates
      if (el.required) field.enableRequired();
      field.updateAppearances(font);
      return;
    }
    case 'dropdown': {
      const field = form.createDropdown(el.key);
      field.addOptions(el.options);
      field.addToPage(ctx.page, { ...widgetRect(ctx, inner), ...plain, font });
      field.setFontSize(size); // needs the default appearance that addToPage creates
      if (el.required) field.enableRequired();
      field.updateAppearances(font);
      return;
    }
    case 'radio': {
      const group = form.createRadioGroup(el.key);
      const top = el.y + inputTop(el.labelStyle.fontSize);
      for (const [index, option] of el.options.entries()) {
        const markTop = top + index * FIELD_ROW_HEIGHT + (FIELD_ROW_HEIGHT - FIELD_MARK_SIZE) / 2;
        group.addOptionToPage(option, ctx.page, {
          ...widgetRect(ctx, {
            x: el.x,
            y: markTop,
            width: FIELD_MARK_SIZE,
            height: FIELD_MARK_SIZE,
          }),
          ...markLook,
        });
      }
      if (el.required) group.enableRequired();
      return;
    }
    case 'checkbox': {
      const top = el.y + inputTop(el.labelStyle.fontSize);
      for (const [index] of el.options.entries()) {
        const markTop = top + index * FIELD_ROW_HEIGHT + (FIELD_ROW_HEIGHT - FIELD_MARK_SIZE) / 2;
        const box1 = form.createCheckBox(`${el.key}__${index}`);
        box1.addToPage(ctx.page, {
          ...widgetRect(ctx, {
            x: el.x,
            y: markTop,
            width: FIELD_MARK_SIZE,
            height: FIELD_MARK_SIZE,
          }),
          ...markLook,
        });
        if (el.required && el.options.length === 1) box1.enableRequired();
      }
      return;
    }
    case 'group':
      // Each cell of a group is added as its own widget while the group is drawn.
      return;
    case 'signature':
    case 'file':
      // pdf-lib cannot create these, so they stay drawn boxes with a hint.
      return;
    default: {
      const unreachable: never = el.fieldType;
      return unreachable;
    }
  }
}

// ---- repeating groups -------------------------------------------------------------------------

/** A repeating group: one bordered card per entry, each cell drawn like a normal field. */
async function drawGroup(ctx: PdfContext, el: FieldElement, value: Value): Promise<void> {
  const s = el.inputStyle;
  const ls = el.labelStyle;
  const filled = ctx.mode === 'filled';
  const rows = parseRows(typeof value === 'string' ? value : undefined);
  const count = ctx.groupRows[el.id] ?? 0;
  const layout = layoutGroup(el, count);
  if (count === 0) {
    await drawMutedHint(
      ctx,
      { ...el, y: el.y + inputTop(ls.fontSize) - 8, height: 56 },
      `No ${el.itemLabel.toLowerCase()} added`,
    );
    return;
  }
  for (const [rowIndex, row] of layout.rows.entries()) {
    const top = el.y + row.y;
    drawBox(ctx, {
      rect: { x: el.x, y: top, width: el.width, height: row.height },
      fill: null,
      stroke: s.stroke,
      strokeWidth: 1,
      radius: s.radius + 4,
    });
    await drawRun(ctx, {
      text: `${el.itemLabel} ${rowIndex + 1}`,
      x: el.x + FIELD_PAD_X,
      baseline: baselineIn(top, GROUP_HEADER, ls.fontFamily, ls.fontSize, ls.fontWeight),
      fontId: ls.fontFamily,
      weight: ls.fontWeight,
      size: ls.fontSize,
      color: ls.color,
    });
    for (const cell of row.cells) {
      const pseudo = cellField(el, rowIndex, cell, { x: el.x, y: top });
      await drawField(ctx, pseudo, filled ? rows[rowIndex]?.[cell.column.id] : undefined);
    }
  }
}

// ---- entry point ------------------------------------------------------------------------------

/** Draws one field. In fillable mode the answer is ignored and real form widgets are added. */
export async function drawField(ctx: PdfContext, el: FieldElement, value: Value): Promise<void> {
  const fillable = ctx.mode === 'fillable';
  await drawLabel(ctx, el);

  if (isOptionList(el.fieldType)) {
    await drawChoices(ctx, el, fillable ? [] : asList(value));
    if (fillable) await addFillableWidgets(ctx, el);
    return;
  }

  const answer = fillable ? '' : asText(value);
  switch (el.fieldType) {
    case 'signature': {
      const signed = answer.startsWith('data:image/png');
      drawInputBox(ctx, el, !signed);
      if (signed) {
        const box = boxRect(el);
        await drawPictureContained(ctx, answer, {
          x: box.x + SIGNATURE_PADDING,
          y: box.y + SIGNATURE_PADDING,
          width: box.width - SIGNATURE_PADDING * 2,
          height: box.height - SIGNATURE_PADDING * 2,
        });
      } else {
        await drawMutedHint(ctx, el, fillable ? 'Sign on the printed form' : 'Not signed');
      }
      return;
    }
    case 'file': {
      drawInputBox(ctx, el, !answer);
      if (answer) {
        const file = getAnswerFile(el.id);
        await drawBoxText(ctx, el, file ? `${answer}  (${formatBytes(file.size)})` : answer, 0);
      } else {
        await drawMutedHint(ctx, el, fillable ? describeFileRules(el) : 'No file attached');
      }
      return;
    }
    case 'longtext': {
      drawInputBox(ctx, el);
      await drawLongText(ctx, el, answer);
      break;
    }
    case 'dropdown': {
      drawInputBox(ctx, el);
      await drawBoxText(ctx, el, answer, 36);
      drawChevron(ctx, el);
      break;
    }
    case 'date': {
      drawInputBox(ctx, el);
      await drawBoxText(ctx, el, formatDate(answer), 0);
      break;
    }
    case 'text': {
      drawInputBox(ctx, el);
      await drawBoxText(ctx, el, answer, 0);
      break;
    }
    case 'group': {
      await drawGroup(ctx, el, value);
      return;
    }
    case 'radio':
    case 'checkbox':
      return;
    default: {
      const unreachable: never = el.fieldType;
      return unreachable;
    }
  }
  if (fillable) await addFillableWidgets(ctx, el);
}
