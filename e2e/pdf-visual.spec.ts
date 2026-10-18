import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

declare global {
  interface Window {
    __compare?: { ignore: unknown[]; warnings: string[] };
  }
}

/** Opens the dev page that draws a design as DOM (left) and as a PDF rendered by pdf.js (right). */
async function compare(page: Page, doc: string, filled: boolean) {
  await page.setViewportSize({ width: 1800, height: 1400 });
  await page.goto(`/dev/pdf-compare?doc=${doc}&filled=${filled ? 1 : 0}`);
  await page.waitForSelector('[data-ready="yes"]', { timeout: 30_000 });
  const info = await page.evaluate(() => window.__compare);
  if (!info) throw new Error('the compare page did not report');
  const dom = PNG.sync.read(await page.getByTestId('dom-page').screenshot());
  const pdf = PNG.sync.read(await page.getByTestId('pdf-page').screenshot());
  const width = Math.min(dom.width, pdf.width);
  const height = Math.min(dom.height, pdf.height);
  const crop = (png: PNG) => {
    const out = new PNG({ width, height });
    PNG.bitblt(png, out, 0, 0, width, height, 0, 0);
    return out;
  };
  const a = crop(dom);
  const b = crop(pdf);
  const mask = new Uint8Array(width * height);
  for (const r of info.ignore as Rect[]) {
    for (
      let y = Math.max(0, Math.floor(r.y));
      y < Math.min(height, Math.ceil(r.y + r.height));
      y += 1
    )
      for (
        let x = Math.max(0, Math.floor(r.x));
        x < Math.min(width, Math.ceil(r.x + r.width));
        x += 1
      )
        mask[y * width + x] = 1;
  }
  const diff = new PNG({ width, height });
  const mismatched = pixelmatch(a.data, b.data, diff.data, width, height, {
    threshold: 0.15,
    ignoreMask: mask,
  });
  mkdirSync('test-results/pdf-visual', { recursive: true });
  writeFileSync(
    `test-results/pdf-visual/${doc}-${filled ? 'filled' : 'blank'}-diff.png`,
    PNG.sync.write(diff),
  );
  return {
    mismatched,
    total: width * height,
    info,
    sizeDiff: [dom.width - pdf.width, dom.height - pdf.height],
  };
}

// Anti-aliasing differs between the browser and pdf.js (most on light text over dark colors), so a
// few percent of pixels always differ. A text line off by one pixel costs far more than this.
const MAX_MISMATCH = 0.015;

test.describe('PDF matches the design', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'one browser is enough for geometry');

  const DOCS = [
    'kitchen-sink-mobile',
    'kitchen-sink-a4',
    'contact-form',
    'event-registration',
    'customer-feedback',
    'newsletter-signup',
    'wedding-rsvp',
    'support-request',
    'lunch-order',
    'job-application',
  ];

  for (const doc of DOCS) {
    for (const filled of [false, true]) {
      test(`${doc} ${filled ? 'with answers' : 'blank'}`, async ({ page }) => {
        const result = await compare(page, doc, filled);
        expect(Math.abs(result.sizeDiff[0] ?? 0)).toBeLessThanOrEqual(1);
        expect(Math.abs(result.sizeDiff[1] ?? 0)).toBeLessThanOrEqual(1);
        expect(result.info.warnings).toEqual([]);
        expect(
          result.mismatched / result.total,
          `${result.mismatched} of ${result.total} pixels differ`,
        ).toBeLessThan(MAX_MISMATCH);
      });
    }
  }
});
