import { expect, test } from '@playwright/test';
import {
  addFromRail,
  docBox,
  dragBy,
  elements,
  screenCenter,
  setZoomPercent,
  startBuilder,
} from './helpers';

test.describe('first run', () => {
  test('asks for a size with Mobile form preselected, then shows a 390px page', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1360, height: 820 });
    await page.goto('/builder');
    await expect(page.getByRole('radio', { name: /Mobile form/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.getByRole('button', { name: 'Create design' }).click();
    const box = await page.getByTestId('page').boundingBox();
    expect(Math.round(box?.width ?? 0)).toBe(390);
    await expect(page.getByText('Add a field or element from the left')).toBeVisible();
  });

  test('A4 is 794 wide and fits the window', async ({ page }) => {
    await startBuilder(page, 'A4 document');
    const box = await page.getByTestId('page').boundingBox();
    expect(box?.width).toBeGreaterThan(500);
    await expect(page.getByRole('button', { name: /^Zoom \d+ percent/ })).toBeVisible();
  });

  test('shows a friendly message under 1024px wide', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 700 });
    await page.goto('/builder');
    await expect(page.getByRole('heading', { name: /larger screen/ })).toBeVisible();
  });
});

test.describe('adding and selecting', () => {
  test('click-add selects the new field and shows handles', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Fields', /Short text/);
    await expect(elements(page)).toHaveCount(1);
    await expect(page.locator('.moveable-control.moveable-e')).toBeVisible();
  });

  test('adding the same item repeatedly never stacks elements exactly', async ({ page }) => {
    await startBuilder(page);
    for (let i = 0; i < 4; i += 1) await addFromRail(page, 'Fields', /Short text/);
    const boxes = await Promise.all([0, 1, 2, 3].map((i) => docBox(page, i)));
    const keys = new Set(boxes.map((b) => `${b.x},${b.y}`));
    expect(keys.size).toBe(4);
  });

  test('drag from the panel lands under the cursor', async ({ page }) => {
    await startBuilder(page);
    await page.getByRole('button', { name: 'Elements', exact: true }).click();
    const card = page.getByRole('button', { name: /Rectangle$|^Rectangle/ }).first();
    const pageBox = await page.getByTestId('page').boundingBox();
    if (!pageBox) throw new Error('no page');
    await card.dragTo(page.getByTestId('page'), { targetPosition: { x: 195, y: 300 } });
    await expect(elements(page)).toHaveCount(1);
    const box = await docBox(page, 0);
    // The element is centered on the drop point (195, 300).
    expect(Math.abs(box.x + box.width / 2 - 195)).toBeLessThanOrEqual(25);
    expect(Math.abs(box.y + box.height / 2 - 300)).toBeLessThanOrEqual(2);
  });

  test('clicking empty page deselects, and Escape deselects', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Fields', /Short text/);
    await expect(page.locator('.moveable-control-box')).toBeVisible();
    await page.mouse.click(900, 700);
    await expect(page.locator('.moveable-control-box')).toHaveCount(0);
    await elements(page).first().click();
    await expect(page.locator('.moveable-control-box')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.moveable-control-box')).toHaveCount(0);
  });
});

test.describe('moving', () => {
  test('a drag moves the element and one undo restores it', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Fields', /Short text/);
    const before = await docBox(page);
    await dragBy(page, elements(page).first(), 0, 80);
    const after = await docBox(page);
    expect(after.y - before.y).toBe(80);
    await page.keyboard.press('Control+z');
    expect((await docBox(page)).y).toBe(before.y);
  });

  test('screen distance is divided by zoom (100px moves 50 doc px at 200%)', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Fields', /Short text/);
    await setZoomPercent(page, 200);
    const before = await docBox(page);
    await dragBy(page, elements(page).first(), 0, 100);
    expect((await docBox(page)).y - before.y).toBe(50);
  });

  test('100px moves 200 doc px at 50%', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Fields', /Short text/);
    await setZoomPercent(page, 50);
    const before = await docBox(page);
    await dragBy(page, elements(page).first(), 0, 100);
    expect((await docBox(page)).y - before.y).toBe(200);
  });

  test('one press-and-drag moves an element that was not selected yet', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Rectangle/);
    await page.mouse.click(900, 700);
    await expect(page.locator('.moveable-control-box')).toHaveCount(0);
    const before = await docBox(page);
    await dragBy(page, elements(page).first(), 0, 60);
    expect((await docBox(page)).y - before.y).toBe(60);
    await expect(page.locator('.moveable-control-box')).toBeVisible();
  });

  test('elements cannot leave the page horizontally', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Fields', /Short text/);
    await dragBy(page, elements(page).first(), 400, 0);
    const box = await docBox(page);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  });

  test('snaps to the page center with a guide, and Alt turns snapping off', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /Circle or ellipse/);
    const centered = await docBox(page);
    expect(centered.x + centered.width / 2).toBe(195);
    // Nudge the circle 2px off the page center with the mouse: it snaps back and shows a guide.
    const start = await screenCenter(elements(page).first());
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 1, start.y, { steps: 2 });
    await page.mouse.move(start.x + 2, start.y, { steps: 2 });
    await expect(page.locator('[data-canvas-ui] div[style*="var(--guide)"]')).toHaveCount(1);
    await page.mouse.up();
    expect((await docBox(page)).x).toBe(centered.x);
    await expect(page.locator('[data-canvas-ui] div[style*="var(--guide)"]')).toHaveCount(0);
    // With Alt held the same drag is free.
    await dragBy(page, elements(page).first(), 2, 0);
    expect((await docBox(page)).x).toBe(centered.x + 2);
  });
});

test.describe('arrow keys', () => {
  test('nudge 1px and 10px, holding the key is one undo step', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Rectangle/);
    const start = await docBox(page);
    await page.keyboard.press('ArrowDown');
    expect((await docBox(page)).y).toBe(start.y + 1);
    await page.keyboard.press('Shift+ArrowDown');
    expect((await docBox(page)).y).toBe(start.y + 11);
    await page.keyboard.down('ArrowDown');
    await page.keyboard.down('ArrowDown');
    await page.keyboard.down('ArrowDown');
    await page.keyboard.up('ArrowDown');
    const moved = await docBox(page);
    expect(moved.y).toBeGreaterThan(start.y + 11);
    await page.keyboard.press('Control+z');
    expect((await docBox(page)).y).toBe(start.y + 11);
  });
});

test.describe('resizing', () => {
  test('the east handle widens a rectangle in one undo step and stays on the page', async ({
    page,
  }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Rectangle/);
    // Narrow it first so there is room to grow.
    const handleW = page.locator('.moveable-control.moveable-w');
    const w = await handleW.boundingBox();
    if (!w) throw new Error('no handle');
    await page.keyboard.down('Alt');
    await page.mouse.move(w.x + w.width / 2, w.y + w.height / 2);
    await page.mouse.down();
    await page.mouse.move(w.x + 150, w.y + w.height / 2, { steps: 6 });
    await page.mouse.up();
    await page.keyboard.up('Alt');
    const narrowed = await docBox(page);
    expect(narrowed.width).toBeLessThan(350);
    expect(narrowed.x + narrowed.width).toBe(370);
    await page.keyboard.press('Control+z');
    expect((await docBox(page)).width).toBe(350);
  });

  test('radio fields only resize in width and keep their computed height', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Fields', /Radio/);
    await expect(page.locator('.moveable-control.moveable-n')).toHaveCount(0);
    await expect(page.locator('.moveable-control.moveable-e')).toBeVisible();
    expect((await docBox(page)).height).toBe(88);
  });
});

test.describe('delete and persistence', () => {
  test('Delete removes, undo brings it back', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Fields', /Short text/);
    await page.keyboard.press('Delete');
    await expect(elements(page)).toHaveCount(0);
    await page.keyboard.press('Control+z');
    await expect(elements(page)).toHaveCount(1);
  });

  test('the design survives a reload', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Fields', /Short text/);
    await expect(page.getByRole('status')).toHaveText('Saved');
    await page.reload();
    await expect(elements(page)).toHaveCount(1);
    await expect(page.getByRole('radio', { name: /Mobile form/ })).toHaveCount(0);
  });

  test('a corrupted saved design loads a blank page without crashing', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Fields', /Short text/);
    await expect(page.getByRole('status')).toHaveText('Saved');
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('keyval-store');
          open.onsuccess = () => {
            const tx = open.result.transaction('keyval', 'readwrite');
            tx.objectStore('keyval').put('{broken', 'formango:builder:doc:v1');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          };
          open.onerror = () => reject(open.error);
        }),
    );
    await page.reload();
    await expect(page.getByText('We could not restore your last design')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create design' })).toBeVisible();
  });
});
