import type { FontId, PagePreset } from '@/types/doc';

export const MAX_ELEMENTS = 150;
export const MAX_TITLE_LENGTH = 120;
export const MAX_TEXT_LENGTH = 2000;
export const MAX_LABEL_LENGTH = 120;
export const MAX_OPTIONS = 50;
export const MAX_IMAGE_BYTES = 1_500_000;
export const MAX_DOC_BYTES = 4_000_000;
export const MAX_FILE_MB = 25;
export const DEFAULT_FILE_MB = 5;

export const SNAP_THRESHOLD_PX = 6;
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 3;
export const WORKSPACE_PADDING = 80;
export const HISTORY_LIMIT = 100;

export const MIN_WIDTH = 80;
export const MIN_TEXT_WIDTH = 40;
export const MIN_SHAPE_SIZE = 8;
export const MIN_BUTTON_HEIGHT = 32;
export const MIN_IMAGE_SIZE = 24;
export const MIN_LINE_WIDTH = 20;
export const AUTO_HEIGHT_PADDING = 80;

export const FIELD_LABEL_GAP = 6;
export const FIELD_ROW_HEIGHT = 32;
export const FIELD_BOX_MIN_HEIGHT = 32;
export const SIGNATURE_MIN_HEIGHT = 120;
export const LABEL_LINE_HEIGHT = 1.3;
/** Inside a field box: text padding, and the checkbox or radio mark and its gap to the option text. */
export const FIELD_PAD_X = 12;
export const FIELD_MARK_SIZE = 16;
export const FIELD_MARK_GAP = 10;

export interface PresetInfo {
  width: number;
  height: number;
  autoHeight: boolean;
  margin: number;
  label: string;
  description: string;
}

export const PRESETS: Record<PagePreset, PresetInfo> = {
  mobile: {
    width: 390,
    height: 844,
    autoHeight: true,
    margin: 20,
    label: 'Mobile form',
    description: 'Fills on phones and grows as you add things. Works like Google Forms.',
  },
  a4: {
    width: 794,
    height: 1123,
    autoHeight: false,
    margin: 40,
    label: 'A4 document',
    description: 'One fixed page for formal documents you print or email.',
  },
};

/** Default colors (the only hex values outside theme.css and templates). Mirrors docs/theme.md. */
export const COLORS = {
  mango: '#FF9F1C',
  tangerine: '#F08400',
  butter: '#FFCF78',
  cream: '#FFF1D6',
  ink: '#2A1805',
  white: '#FFFFFF',
  leaf: '#4C9A2A',
  teal: '#1F8A8A',
  sky: '#3B82C4',
  violet: '#6D5BD0',
  guava: '#F2667A',
  berry: '#CF3340',
  inkMuted: '#7A5C3A',
  inkBorder: '#A58B6A',
  inkDivider: '#C9B497',
} as const;

export const DEFAULT_PALETTE: { name: string; hex: string }[] = [
  { name: 'Mango', hex: COLORS.mango },
  { name: 'Tangerine', hex: COLORS.tangerine },
  { name: 'Butter', hex: COLORS.butter },
  { name: 'Cream', hex: COLORS.cream },
  { name: 'Ink', hex: COLORS.ink },
  { name: 'White', hex: COLORS.white },
  { name: 'Leaf', hex: COLORS.leaf },
  { name: 'Teal', hex: COLORS.teal },
  { name: 'Sky', hex: COLORS.sky },
  { name: 'Violet', hex: COLORS.violet },
  { name: 'Guava', hex: COLORS.guava },
  { name: 'Berry', hex: COLORS.berry },
];

export const DEFAULT_FONT: FontId = 'dm-sans';
export const RECENT_COLORS_MAX = 12;
