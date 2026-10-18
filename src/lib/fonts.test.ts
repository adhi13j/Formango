import { afterEach, describe, expect, it, vi } from 'vitest';
import { FONT_IDS, FONTS, fontString, loadAllFonts, loadFonts } from '@/lib/fonts';

function stubFonts(load: (font: string) => Promise<unknown>): void {
  Object.defineProperty(document, 'fonts', { value: { load }, configurable: true });
}

afterEach(() => {
  Reflect.deleteProperty(document, 'fonts');
  vi.useRealTimers();
});

describe('fonts', () => {
  it('describes both weights for every font id', () => {
    for (const id of FONT_IDS) {
      expect(FONTS[id].files[400].woff2).toBe(`/fonts/${id}-400.woff2`);
      expect(FONTS[id].files[700].ttf).toBe(`/fonts/ttf/${id}-700.ttf`);
    }
  });

  it('builds a quoted canvas font string', () => {
    expect(fontString('playfair', 700, 28)).toBe('700 28px "Playfair Display"');
  });

  it('resolves when the browser has no FontFaceSet', async () => {
    await expect(loadFonts(['poppins'])).resolves.toBeUndefined();
  });

  it('loads both weights of each requested font', async () => {
    const load = vi.fn().mockResolvedValue([]);
    stubFonts(load);
    await loadFonts(['lora', 'caveat']);
    expect(load).toHaveBeenCalledTimes(4);
    expect(load).toHaveBeenCalledWith('400 16px "Lora"');
    expect(load).toHaveBeenCalledWith('700 16px "Caveat"');
  });

  it('never rejects when a font fails to load', async () => {
    stubFonts(() => Promise.reject(new Error('404')));
    await expect(loadAllFonts()).resolves.toBeUndefined();
  });

  it('gives up after the timeout when a font never finishes', async () => {
    vi.useFakeTimers();
    stubFonts(() => new Promise(() => undefined));
    const done = loadFonts(['inter']);
    await vi.advanceTimersByTimeAsync(4000);
    await expect(done).resolves.toBeUndefined();
  });
});
