import type { FontId } from '@/lib/fonts';

export type { FontId };

export type PagePreset = 'mobile' | 'a4';

export interface SubmitSettings {
  label: string;
  fill: string;
  textColor: string;
}

export interface PageSettings {
  preset: PagePreset;
  /** mobile 390, a4 794 */
  width: number;
  /** mobile: minimum height 844. a4: fixed 1123 */
  height: number;
  /** mobile true, a4 false */
  autoHeight: boolean;
  background: string;
  outerBackground: string;
  /** layout grid margin: mobile 20, a4 40 */
  margin: number;
  submit: SubmitSettings;
}

export interface BaseElement {
  id: string;
  type: 'text' | 'shape' | 'line' | 'image' | 'field';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  locked: boolean;
  hidden: boolean;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  role: 'heading' | 'body';
  fontFamily: FontId;
  fontSize: number;
  fontWeight: 400 | 700;
  color: string;
  align: 'left' | 'center' | 'right';
  lineHeight: number;
  autoHeight: boolean;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shape: 'rect' | 'ellipse';
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  radius: number;
  opacity: number;
}

export interface LineElement extends BaseElement {
  type: 'line';
  color: string;
  thickness: number;
  style: 'solid' | 'dashed';
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  alt: string;
  radius: number;
  opacity: number;
  fit: 'cover' | 'contain';
}

export type FieldType =
  'text' | 'longtext' | 'dropdown' | 'checkbox' | 'radio' | 'date' | 'signature';

export type FieldValidation = 'none' | 'email' | 'phone' | 'number';

export interface LabelStyle {
  fontFamily: FontId;
  fontSize: number;
  fontWeight: 400 | 700;
  color: string;
}

export interface InputStyle {
  fontFamily: FontId;
  fontSize: number;
  textColor: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
}

export interface FieldElement extends BaseElement {
  type: 'field';
  fieldType: FieldType;
  /** Unique slug used as the PDF field name. Frozen at creation. Answers are keyed by `id`. */
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  validation: FieldValidation;
  options: string[];
  labelStyle: LabelStyle;
  inputStyle: InputStyle;
}

export type DocElement = TextElement | ShapeElement | LineElement | ImageElement | FieldElement;
export type ElementType = DocElement['type'];

export interface FormDoc {
  version: 1;
  title: string;
  page: PageSettings;
  /** Array order is z-order. The last item is on top. */
  elements: DocElement[];
}

/** Answers keyed by FieldElement.id. Empty answers are omitted. */
export type Answers = Record<string, string | string[]>;
