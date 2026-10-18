import { describe, expect, it } from 'vitest';
import { createBlankDoc, migrate, parseDoc } from '@/types/doc.schema';

describe('submit button', () => {
  it('is part of every new document, at the bottom', () => {
    const doc = createBlankDoc('a4');
    const buttons = doc.elements.filter((el) => el.type === 'button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toMatchObject({ label: 'Submit', y: 1035, x: 40, width: 714 });
  });

  it('is added to an older document that has none, and old page.submit data is ignored', () => {
    const old = { ...createBlankDoc('mobile'), elements: [] };
    const raw = { ...old, page: { ...old.page, submit: { label: 'Send' } } };
    const result = parseDoc(raw);
    expect(result.ok && result.doc.elements.filter((el) => el.type === 'button')).toHaveLength(1);
  });

  it('keeps only one when a file contains several', () => {
    const doc = createBlankDoc('mobile');
    const [button] = doc.elements;
    const raw = { ...doc, elements: [button, { ...button, id: 'second' }] };
    const result = parseDoc(raw);
    expect(result.ok && result.doc.elements).toHaveLength(1);
  });
});

describe('file fields', () => {
  it('get default file rules when an older file lacks them', () => {
    const doc = createBlankDoc('mobile');
    const field = {
      id: 'f1',
      type: 'field',
      fieldType: 'file',
      name: 'File',
      x: 20,
      y: 20,
      width: 300,
      height: 96,
      locked: false,
      hidden: false,
      key: 'file',
      label: 'File',
      placeholder: '',
      required: false,
      validation: 'none',
      options: [],
      labelStyle: { fontFamily: 'dm-sans', fontSize: 14, fontWeight: 700, color: '#2A1805' },
      inputStyle: {
        fontFamily: 'dm-sans',
        fontSize: 16,
        textColor: '#2A1805',
        fill: '#FFFFFF',
        stroke: '#A58B6A',
        strokeWidth: 1,
        radius: 8,
      },
    };
    const result = parseDoc({ ...doc, elements: [field, ...doc.elements] });
    expect(result.ok).toBe(true);
    const parsed = result.ok ? result.doc.elements[0] : undefined;
    expect(parsed).toMatchObject({ fileKinds: [], maxFileMb: 5 });
  });
});

describe('doc schema', () => {
  it('accepts a blank doc for both presets', () => {
    expect(parseDoc(createBlankDoc('mobile')).ok).toBe(true);
    const a4 = parseDoc(createBlankDoc('a4'));
    expect(a4.ok && a4.doc.page.width).toBe(794);
  });

  it('rejects an unknown element type', () => {
    const doc = { ...createBlankDoc(), elements: [{ id: 'a', type: 'sparkle' }] };
    expect(parseDoc(doc).ok).toBe(false);
  });

  it('normalizes colors to uppercase #RRGGBB and rounds geometry', () => {
    const doc = createBlankDoc();
    doc.page.background = '#abcdef';
    const raw = {
      ...doc,
      elements: [
        {
          id: 'l1',
          type: 'line',
          name: 'Line',
          x: 1.4,
          y: 2.6,
          width: 100.2,
          height: 2,
          locked: false,
          hidden: false,
          color: '#112233',
          thickness: 2,
          style: 'solid',
        },
      ],
    };
    const result = parseDoc(raw);
    expect(result.ok && result.doc.page.background).toBe('#ABCDEF');
    expect(result.ok && result.doc.elements[0]).toMatchObject({ x: 1, y: 3, width: 100 });
  });

  it('rejects non-hex colors and svg images', () => {
    const bad = createBlankDoc();
    bad.page.background = 'red';
    expect(parseDoc(bad).ok).toBe(false);
    const svg = {
      ...createBlankDoc(),
      elements: [
        {
          id: 'i1',
          type: 'image',
          name: 'Img',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          locked: false,
          hidden: false,
          src: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
          alt: '',
          radius: 0,
          opacity: 1,
          fit: 'cover',
        },
      ],
    };
    expect(parseDoc(svg).ok).toBe(false);
  });

  it('rejects duplicate element ids and more than 150 elements', () => {
    const line = {
      id: 'dup',
      type: 'line',
      name: 'Line',
      x: 0,
      y: 0,
      width: 50,
      height: 2,
      locked: false,
      hidden: false,
      color: '#112233',
      thickness: 2,
      style: 'solid',
    };
    expect(parseDoc({ ...createBlankDoc(), elements: [line, line] }).ok).toBe(false);
    const many = Array.from({ length: 151 }, (_, i) => ({ ...line, id: `e${i}` }));
    expect(parseDoc({ ...createBlankDoc(), elements: many }).ok).toBe(false);
  });

  it('migrate returns a valid doc for version 1 and reports unknown versions', () => {
    const doc = createBlankDoc();
    expect(parseDoc(migrate(doc)).ok).toBe(true);
    const future = parseDoc({ ...doc, version: 2 });
    expect(future.ok).toBe(false);
    expect(!future.ok && future.errors[0]).toMatch(/version/i);
  });

  it('describes problems with a readable path', () => {
    const doc = { ...createBlankDoc(), title: '' };
    const result = parseDoc(doc);
    expect(!result.ok && result.errors[0]).toContain('title');
  });

  it('rejects garbage input without throwing', () => {
    expect(parseDoc(null).ok).toBe(false);
    expect(parseDoc('nope').ok).toBe(false);
    expect(parseDoc(42).ok).toBe(false);
  });
});
