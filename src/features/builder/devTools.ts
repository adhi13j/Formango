import { createElement, type NewElementKind } from '@/lib/elements';
import { MAX_ELEMENTS } from '@/lib/constants';
import { useDocStore } from '@/store/docStore';

const KINDS: NewElementKind[] = [
  'heading',
  'body',
  'rect',
  'rounded-rect',
  'ellipse',
  'line',
  'field-text',
  'field-longtext',
  'field-dropdown',
  'field-radio',
  'field-checkbox',
  'field-date',
];

/** Development helper for performance checks. The menu item is not rendered in production builds. */
export function addSampleElements(count: number): void {
  const store = useDocStore.getState();
  const room = MAX_ELEMENTS - store.doc.elements.length;
  for (let i = 0; i < Math.min(count, room); i += 1) {
    const el = createElement(KINDS[i % KINDS.length] ?? 'rect', useDocStore.getState().doc);
    const column = i % 4;
    store.addElement({ ...el, x: 20 + column * 20, y: 20 + Math.floor(i / 4) * 40 + column * 6 });
  }
}
