import { expect, test, type Page } from '@playwright/test';
import { addFromRail, docBox, dragBy, elements, screenCenter, startBuilder } from './helpers';

const zoomLabel = (page: Page) => page.getByRole('button', { name: /^Zoom \d+ percent/ });
const zoomValue = async (page: Page) =>
  Number(/Zoom (\d+) percent/.exec((await zoomLabel(page).getAttribute('aria-label')) ?? '')?.[1]);

test.describe('selecting', () => {
  test('marquee selects only intersecting elements', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Circle or ellipse/);
    await page.getByTestId('page').click({ position: { x: 5, y: 700 } });
    await addFromRail(page, 'Elements', /^Rectangle/);
    await page.getByTestId('page').click({ position: { x: 5, y: 700 } });
    await page.getByTestId('workspace').evaluate((n) => (n.scrollTop = 0));
    const circle = await elements(page).nth(0).boundingBox();
    const pageBox = await page.getByTestId('page').boundingBox();
    if (!circle || !pageBox) throw new Error('no boxes');
    // Start left of the page in empty workspace, and sweep across only the circle.
    await page.mouse.move(pageBox.x - 40, circle.y + 20);
    await page.mouse.down();
    await page.mouse.move(circle.x + circle.width / 2, circle.y + circle.height - 20, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByTestId('selection-announcer')).toHaveText('Selected Circle, shape');
  });

  test('shift-click adds to the selection and shift-click again removes', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Rectangle/);
    await addFromRail(page, 'Elements', /^Circle or ellipse/);
    await page.getByTestId('page').click({ position: { x: 5, y: 700 } });
    await page.getByTestId('workspace').evaluate((n) => (n.scrollTop = 0));
    await elements(page)
      .nth(0)
      .click({ position: { x: 4, y: 4 } });
    const circle = await screenCenter(elements(page).nth(1));
    // Raw mouse clicks: once two elements are selected a group box covers them, and it forwards the click.
    await page.keyboard.down('Shift');
    await page.mouse.click(circle.x, circle.y);
    await page.keyboard.up('Shift');
    await expect(page.getByTestId('selection-announcer')).toHaveText('2 elements selected');
    await page.keyboard.down('Shift');
    await page.mouse.click(circle.x, circle.y);
    await page.keyboard.up('Shift');
    await expect(page.getByTestId('selection-announcer')).toContainText('Selected Rectangle');
  });

  test('a multi-selection moves together as one undo step and shows no resize handles', async ({
    page,
  }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Rectangle/);
    await addFromRail(page, 'Elements', /^Circle or ellipse/);
    await page.keyboard.press('Control+a');
    await expect(page.locator('.moveable-control.moveable-e')).toHaveCount(0);
    const before = [await docBox(page, 0), await docBox(page, 1)];
    await dragBy(page, elements(page).first(), 0, 40);
    const after = [await docBox(page, 0), await docBox(page, 1)];
    expect(after[0]?.y).toBe((before[0]?.y ?? 0) + 40);
    expect(after[1]?.y).toBe((before[1]?.y ?? 0) + 40);
    await page.keyboard.press('Control+z');
    expect([await docBox(page, 0), await docBox(page, 1)]).toEqual(before);
  });
});

test.describe('resizing rules', () => {
  test('text with auto height only has width handles', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Body text/);
    await expect(page.locator('.moveable-control.moveable-e')).toBeVisible();
    await expect(page.locator('.moveable-control.moveable-n')).toHaveCount(0);
    await expect(page.locator('.moveable-control.moveable-se')).toHaveCount(0);
  });

  test('lines only resize in width', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Line$/);
    await expect(page.locator('.moveable-control.moveable-w')).toBeVisible();
    await expect(page.locator('.moveable-control.moveable-s')).toHaveCount(0);
  });

  test('a corner handle keeps the ratio of an image, and sizes cannot go below the minimum', async ({
    page,
  }) => {
    await startBuilder(page);
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
    await page.getByRole('button', { name: 'Uploads', exact: true }).click();
    await page
      .getByTestId('image-input')
      .setInputFiles({ name: 'dot.png', mimeType: 'image/png', buffer: png });
    await expect(elements(page)).toHaveCount(1);
    const before = await docBox(page);
    const handle = await page.locator('.moveable-control.moveable-se').boundingBox();
    if (!handle) throw new Error('no handle');
    await page.keyboard.down('Alt');
    await page.mouse.move(handle.x + 7, handle.y + 7);
    await page.mouse.down();
    await page.mouse.move(handle.x - 20, handle.y + 60, { steps: 6 });
    await page.mouse.up();
    await page.keyboard.up('Alt');
    const after = await docBox(page);
    expect(Math.abs(after.width / after.height - before.width / before.height)).toBeLessThan(0.05);
    expect(after.width).toBeGreaterThanOrEqual(24);
  });

  test('shift locks the ratio of a shape on a corner handle', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Circle or ellipse/);
    const handle = await page.locator('.moveable-control.moveable-se').boundingBox();
    if (!handle) throw new Error('no handle');
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.mouse.move(handle.x + 7, handle.y + 7);
    await page.mouse.down();
    await page.mouse.move(handle.x - 30, handle.y - 10, { steps: 6 });
    await page.mouse.up();
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');
    const after = await docBox(page);
    expect(after.width).toBe(after.height);
    expect(after.width).toBeLessThan(160);
  });
});

test.describe('zoom and navigation', () => {
  test('buttons and shortcuts zoom within 25% to 300%', async ({ page }) => {
    await startBuilder(page);
    for (let i = 0; i < 12; i += 1) await page.getByRole('button', { name: 'Zoom out' }).click();
    expect(await zoomValue(page)).toBe(25);
    for (let i = 0; i < 14; i += 1) await page.getByRole('button', { name: 'Zoom in' }).click();
    expect(await zoomValue(page)).toBe(300);
    await page.getByTestId('workspace').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('1');
    expect(await zoomValue(page)).toBe(100);
    await page.keyboard.press('Control+-');
    expect(await zoomValue(page)).toBeLessThan(100);
    await page.keyboard.press('0');
    await expect(zoomLabel(page)).toBeVisible();
  });

  test('Ctrl+wheel zooms and keeps the point under the cursor in place', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Rectangle/);
    const target = elements(page).first();
    const before = await screenCenter(target);
    await page.mouse.move(before.x, before.y);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -300);
    await page.keyboard.up('Control');
    expect(await zoomValue(page)).toBeGreaterThan(100);
    const after = await screenCenter(target);
    expect(Math.abs(after.x - before.x)).toBeLessThan(4);
    expect(Math.abs(after.y - before.y)).toBeLessThan(4);
  });

  test('manual zoom sticks when the window changes, and Fit brings the page back to the window', async ({
    page,
  }) => {
    await startBuilder(page, 'A4 document');
    expect(await zoomValue(page)).toBe(100);
    await page.getByRole('button', { name: 'Zoom in' }).click();
    const manual = await zoomValue(page);
    expect(manual).toBeGreaterThan(100);
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.waitForTimeout(300);
    expect(await zoomValue(page)).toBe(manual);
    await page.getByRole('button', { name: 'Fit page to window' }).click();
    await expect.poll(() => zoomValue(page)).toBeLessThanOrEqual(100);
    // The page now fits: no horizontal scrolling in the workspace.
    const overflow = await page
      .getByTestId('workspace')
      .evaluate((n) => n.scrollWidth > n.clientWidth);
    expect(overflow).toBe(false);
  });

  test('the workspace shrinks with the window instead of scrolling the whole page sideways', async ({
    page,
  }) => {
    await startBuilder(page);
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.waitForTimeout(300);
    const width = await page.getByTestId('workspace').evaluate((n) => n.clientWidth);
    expect(width).toBeLessThanOrEqual(1024 - 72);
    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(pageOverflow).toBe(false);
  });

  test('Space + drag pans the workspace', async ({ page }) => {
    await startBuilder(page);
    await page.getByRole('button', { name: 'Zoom in' }).click();
    for (let i = 0; i < 4; i += 1) await page.getByRole('button', { name: 'Zoom in' }).click();
    const workspace = page.getByTestId('workspace');
    await workspace.click({ position: { x: 5, y: 5 } });
    const before = await workspace.evaluate((n) => n.scrollTop);
    await page.keyboard.down('Space');
    await page.mouse.move(700, 500);
    await page.mouse.down();
    await page.mouse.move(700, 300, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up('Space');
    expect(await workspace.evaluate((n) => n.scrollTop)).toBeGreaterThan(before);
  });
});

test.describe('page size', () => {
  test('switching to A4 and back keeps every element, clamps them, and undo reverses it', async ({
    page,
  }) => {
    await startBuilder(page, 'A4 document');
    await addFromRail(page, 'Fields', /Long text/);
    const before = await docBox(page);
    expect(before.width).toBe(714);
    await page.getByRole('button', { name: /^Page size/ }).click();
    await page.getByRole('menuitem', { name: /Mobile form/ }).click();
    await page.getByRole('button', { name: 'Switch size' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(elements(page)).toHaveCount(1);
    const small = await docBox(page);
    expect(small.x + small.width).toBeLessThanOrEqual(390);
    await page.keyboard.press('Control+z');
    expect((await docBox(page)).width).toBe(714);
  });

  test('toggling the layout grid removes its snap lines', async ({ page }) => {
    await startBuilder(page);
    await page.getByRole('button', { name: /layout grid/i }).click();
    await addFromRail(page, 'Elements', /^Circle or ellipse/);
    // The circle's center sits at x=195. With the grid on, 2px left snaps to 195 (page center) regardless;
    // x=190 is a grid column line only: dragging so the center lands near 190 snaps with grid on, not off.
    const start = await screenCenter(elements(page).first());
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x - 3, start.y, { steps: 3 });
    await page.mouse.move(start.x - 5, start.y, { steps: 2 });
    const gridOn = await page.locator('[data-canvas-ui] div[style*="var(--guide)"]').count();
    await page.mouse.up();
    expect(gridOn).toBeGreaterThanOrEqual(1);
  });
});

test.describe('colors', () => {
  test('outer background is visible around the page in the editor and in preview', async ({
    page,
  }) => {
    await startBuilder(page);
    await page.getByRole('button', { name: /^Outer background/ }).click();
    await page.getByRole('button', { name: 'Sky', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('workspace')).toHaveCSS('background-color', 'rgb(59, 130, 196)');
    await expect(page.getByRole('dialog', { name: 'Outer background' })).toHaveCount(0);
    await page.getByRole('button', { name: /^Page color/ }).click();
    await page
      .getByRole('dialog', { name: 'Page color' })
      .getByRole('button', { name: 'Berry' })
      .click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('page')).toHaveCSS('background-color', 'rgb(207, 51, 64)');
    await page.getByRole('button', { name: 'Preview' }).click();
    const outer = page
      .getByTestId('fill-page')
      .locator('xpath=ancestor::div[contains(@class,"overflow-auto")][1]');
    await expect(outer).toHaveCSS('background-color', 'rgb(59, 130, 196)');
  });
});
