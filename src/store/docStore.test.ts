import { beforeEach, describe, expect, it } from 'vitest';
import { createElement } from '@/lib/elements';
import { MAX_ELEMENTS } from '@/lib/constants';
import { beginBatch, endBatch, redo, temporalStore, undo, useDocStore } from '@/store/docStore';
import { createBlankDoc } from '@/types/doc.schema';
import type { DocElement, FieldElement, TextElement } from '@/types/doc';

const store = () => useDocStore.getState();
const elements = () => store().doc.elements.filter((el) => el.type !== 'button');
const history = () => temporalStore.getState().pastStates.length;

function add(kind: Parameters<typeof createElement>[0]): DocElement {
  const el = createElement(kind, store().doc);
  store().addElement(el);
  return el;
}

beforeEach(() => {
  store().loadDoc(createBlankDoc('mobile'));
});

describe('adding and removing', () => {
  it('adds elements on top, in order', () => {
    const a = add('heading');
    const b = add('rect');
    expect(elements().map((e) => e.id)).toEqual([a.id, b.id]);
  });

  it('refuses to go past the element limit', () => {
    // The submit button counts toward the limit.
    for (let i = 0; i < MAX_ELEMENTS - 1; i += 1)
      store().addElement(createElement('line', store().doc));
    expect(store().doc.elements).toHaveLength(MAX_ELEMENTS);
    expect(store().addElement(createElement('line', store().doc))).toBe(false);
    expect(store().doc.elements).toHaveLength(MAX_ELEMENTS);
  });

  it('removes elements', () => {
    const a = add('heading');
    const b = add('rect');
    store().removeElements([a.id]);
    expect(elements().map((e) => e.id)).toEqual([b.id]);
  });
});

describe('updating and normalizing', () => {
  it('rounds geometry to whole pixels', () => {
    const a = add('rect');
    store().updateElement(a.id, { x: 20.4, y: 30.6, width: 100.5, height: 50.2 });
    expect(elements()[0]).toMatchObject({ x: 20, y: 31, width: 101, height: 50 });
  });

  it('enforces minimum sizes', () => {
    const a = add('rect');
    store().updateElement(a.id, { width: 1, height: 1 });
    expect(elements()[0]).toMatchObject({ width: 8, height: 8 });
    const f = add('field-text');
    store().updateElement(f.id, { width: 10, height: 10 });
    expect(elements()[1]).toMatchObject({ width: 80, height: 56 });
  });

  it('keeps elements inside the page horizontally and above y 0', () => {
    const a = add('rect');
    store().updateElement(a.id, { x: 500, y: -20 });
    expect(elements()[0]).toMatchObject({ x: 40, y: 0 });
  });

  it('keeps A4 elements inside vertically', () => {
    store().newDoc('a4');
    const a = add('rect');
    store().updateElement(a.id, { y: 5000 });
    expect(elements()[0]).toMatchObject({ y: 1123 - 120 });
  });

  it('recomputes radio height from its option count and ignores manual heights', () => {
    const r = add('field-radio') as FieldElement;
    expect(r.height).toBe(88);
    store().updateElement(r.id, { options: ['a', 'b', 'c', 'd'] });
    expect(elements()[0]?.height).toBe(24 + 4 * 32);
    store().updateElement(r.id, { height: 400 });
    expect(elements()[0]?.height).toBe(24 + 4 * 32);
  });

  it('never leaves a dropdown without options', () => {
    const d = add('field-dropdown');
    store().updateElement(d.id, { options: [] });
    expect((elements()[0] as FieldElement).options).toEqual(['Option 1']);
  });

  it('recomputes auto-height text when the width or text changes', () => {
    const t = add('body') as TextElement;
    const oneLine = t.height;
    store().updateElement(t.id, { text: 'word '.repeat(40) });
    expect(elements()[0]?.height).toBeGreaterThan(oneLine);
    store().updateElement(t.id, { text: 'short' });
    expect(elements()[0]?.height).toBe(oneLine);
  });

  it('forces a line height to equal its thickness', () => {
    const l = add('line');
    store().updateElement(l.id, { thickness: 6 });
    expect(elements()[0]?.height).toBe(6);
  });
});

describe('duplicate, reorder, lock, hide, rename', () => {
  it('duplicates with an offset, new ids, copy names, and unique field keys', () => {
    const f = add('field-text') as FieldElement;
    const [copyId] = store().duplicateElements([f.id]);
    const copy = elements().find((e) => e.id === copyId) as FieldElement;
    expect(copy.id).not.toBe(f.id);
    expect(copy.name).toBe('Short text copy');
    expect(copy).toMatchObject({ x: f.x + 16, y: f.y + 16 });
    expect(copy.key).not.toBe(f.key);
  });

  it('reorders to front, back, forward, and backward', () => {
    const [a, b, c] = [add('rect'), add('ellipse'), add('line')];
    // The submit button is a layer too: it starts at the bottom of the stack.
    const button = store().doc.elements[0]?.id ?? '';
    const order = () => store().doc.elements.map((e) => e.id);
    store().reorder([a.id], 'front');
    expect(order()).toEqual([button, b.id, c.id, a.id]);
    store().reorder([a.id], 'back');
    expect(order()).toEqual([a.id, button, b.id, c.id]);
    store().reorder([a.id], 'forward');
    expect(order()).toEqual([button, a.id, b.id, c.id]);
    store().reorder([a.id], 'backward');
    expect(order()).toEqual([a.id, button, b.id, c.id]);
  });

  it('keeps the relative order of a multi-selection when reordering', () => {
    const [a, b, c, d] = [add('rect'), add('ellipse'), add('line'), add('heading')];
    store().reorder([a.id, c.id], 'front');
    expect(elements().map((e) => e.id)).toEqual([b.id, d.id, a.id, c.id]);
  });

  it('does not add history when reordering at the end', () => {
    const [a] = [add('rect'), add('ellipse')];
    store().reorder([a.id], 'back');
    const before = history();
    store().reorder([a.id], 'back');
    expect(history()).toBe(before);
  });

  it('locks, hides, and renames', () => {
    const a = add('rect');
    store().setLocked([a.id], true);
    store().setHidden([a.id], true);
    store().renameElement(a.id, '  Banner  ');
    expect(elements()[0]).toMatchObject({ locked: true, hidden: true, name: 'Banner' });
  });
});

describe('page settings', () => {
  it('switches preset, keeps every element, and clamps them to the new width', () => {
    store().newDoc('a4');
    const a = createElement('rect', store().doc);
    store().addElement({ ...a, x: 300, width: 400 });
    store().switchPreset('mobile');
    expect(elements()).toHaveLength(1);
    expect(store().doc.page).toMatchObject({ preset: 'mobile', width: 390, autoHeight: true });
    expect(elements()[0]).toMatchObject({ x: 0, width: 390 });
  });

  it('keeps exactly one submit button that cannot be removed or duplicated', () => {
    const button = () => store().doc.elements.filter((el) => el.type === 'button');
    expect(button()).toHaveLength(1);
    const id = button()[0]?.id ?? '';
    store().removeElements([id]);
    expect(button().map((el) => el.id)).toEqual([id]);
    expect(store().duplicateElements([id])).toEqual([]);
    store().updateElement(id, { label: 'Send' });
    expect(button()[0]).toMatchObject({ label: 'Send', fill: '#FF9F1C' });
  });

  it('falls back to a default title and caps its length', () => {
    store().setTitle('   ');
    expect(store().doc.title).toBe('Untitled form');
    store().setTitle('x'.repeat(300));
    expect(store().doc.title).toHaveLength(120);
  });
});

describe('history', () => {
  it('undoes and redoes an add', () => {
    const a = add('rect');
    expect(elements()).toHaveLength(1);
    undo();
    expect(elements()).toHaveLength(0);
    redo();
    expect(elements()[0]?.id).toBe(a.id);
  });

  it('adds no history entry for a change that alters nothing', () => {
    const a = add('rect');
    const before = history();
    store().updateElement(a.id, { x: a.x });
    store().setTitle(store().doc.title);
    store().setLocked([a.id], false);
    store().removeElements(['missing']);
    expect(history()).toBe(before);
  });

  it('loadDoc clears history', () => {
    add('rect');
    store().loadDoc(createBlankDoc('a4'));
    expect(history()).toBe(0);
    expect(temporalStore.getState().futureStates).toHaveLength(0);
  });

  it('replaceDoc is one undoable step', () => {
    add('rect');
    store().replaceDoc(createBlankDoc('a4'));
    expect(store().doc.page.preset).toBe('a4');
    undo();
    expect(store().doc.page.preset).toBe('mobile');
    expect(elements()).toHaveLength(1);
  });

  it('groups a batch of writes into one undo step', () => {
    const a = add('rect');
    const before = history();
    const batch = beginBatch();
    for (let x = 1; x <= 20; x += 1) store().updateElement(a.id, { x });
    endBatch(batch);
    expect(history()).toBe(before + 1);
    expect(elements()[0]?.x).toBe(20);
    undo();
    expect(elements()[0]?.x).toBe(a.x);
  });

  it('records nothing for an empty batch', () => {
    add('rect');
    const before = history();
    endBatch(beginBatch());
    expect(history()).toBe(before);
  });

  it('keeps at most 100 history entries', () => {
    const a = add('rect');
    for (let i = 1; i <= 130; i += 1) store().updateElement(a.id, { x: i % 200 });
    expect(history()).toBeLessThanOrEqual(100);
  });
});
