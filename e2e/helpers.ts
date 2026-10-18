import { expect, type Locator, type Page } from '@playwright/test';

export async function startBuilder(
  page: Page,
  preset: 'Mobile form' | 'A4 document' = 'Mobile form',
) {
  await page.setViewportSize({ width: 1360, height: 820 });
  await page.goto('/builder');
  await page.getByRole('radio', { name: new RegExp(preset) }).click();
  await page.getByRole('button', { name: 'Create design' }).click();
  await expect(page.getByTestId('page')).toBeVisible();
}

/** Opens a rail panel, clicks a card, and closes the panel again. */
export async function addFromRail(page: Page, rail: string, card: RegExp | string) {
  await page.getByRole('button', { name: rail, exact: true }).click();
  await page.getByRole('button', { name: card }).first().click();
  await page.getByRole('button', { name: 'Close panel' }).click();
}

/** Every element except the submit button, which every form has and most tests ignore. */
export const elements = (page: Page): Locator =>
  page.locator('[data-element-id]:not([data-element-type="button"])');

export const submitButton = (page: Page): Locator => page.locator('[data-element-type="button"]');

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Document-pixel geometry of the nth element, read from its inline style. */
export async function docBox(page: Page, index = 0): Promise<Box> {
  return elements(page)
    .nth(index)
    .evaluate((node) => {
      const style = (node as HTMLElement).style;
      return {
        x: parseFloat(style.left),
        y: parseFloat(style.top),
        width: parseFloat(style.width),
        height: parseFloat(style.height),
      };
    });
}

export async function screenCenter(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element is not visible');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export async function setZoomPercent(page: Page, percent: number) {
  await page.getByRole('button', { name: /^Zoom \d+ percent/ }).click();
  await page.getByRole('menuitem', { name: `${percent}%`, exact: true }).click();
}

/** Drags by screen pixels from the center of `locator`, with snapping off (Alt held). */
export async function dragBy(page: Page, locator: Locator, dx: number, dy: number, snap = false) {
  const start = await screenCenter(locator);
  if (!snap) await page.keyboard.down('Alt');
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + dx / 2, start.y + dy / 2, { steps: 4 });
  await page.mouse.move(start.x + dx, start.y + dy, { steps: 4 });
  await page.mouse.up();
  if (!snap) await page.keyboard.up('Alt');
}
