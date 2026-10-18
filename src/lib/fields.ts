import {
  FIELD_BOX_MIN_HEIGHT,
  FIELD_LABEL_GAP,
  FIELD_ROW_HEIGHT,
  LABEL_LINE_HEIGHT,
  SIGNATURE_MIN_HEIGHT,
} from '@/lib/constants';
import type { FieldElement, FieldType } from '@/types/doc';

export function labelHeight(labelFontSize: number): number {
  return Math.round(labelFontSize * LABEL_LINE_HEIGHT);
}

/** Top of the input area, relative to the element. */
export function inputTop(labelFontSize: number): number {
  return labelHeight(labelFontSize) + FIELD_LABEL_GAP;
}

export function isOptionList(fieldType: FieldType): boolean {
  return fieldType === 'radio' || fieldType === 'checkbox';
}

/** Radio and checkbox heights are fully determined by their option count. */
export function optionListHeight(labelFontSize: number, optionCount: number): number {
  return inputTop(labelFontSize) + optionCount * FIELD_ROW_HEIGHT;
}

export function minFieldHeight(
  field: Pick<FieldElement, 'fieldType' | 'labelStyle' | 'options'>,
): number {
  const top = inputTop(field.labelStyle.fontSize);
  if (isOptionList(field.fieldType))
    return optionListHeight(field.labelStyle.fontSize, field.options.length);
  if (field.fieldType === 'signature') return top + SIGNATURE_MIN_HEIGHT;
  return top + FIELD_BOX_MIN_HEIGHT;
}
