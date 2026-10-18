import { expect, test } from '@playwright/test';
import { elements, startBuilder } from './helpers';

// Runs alone (see the "perf" project) because timing is meaningless while other tests use the CPU.
test.describe('performance', () => {
  test('dragging one element changes no other element in the DOM', async ({ page }) => {
    await startBuilder(page);
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: /Add 100 elements/ }).click();
    await expect(elements(page)).toHaveCount(100);
    await page.keyboard.press('Escape');
    const target = elements(page).last();
    await target.click({ force: true });
    await expect(page.locator('.moveable-control-box')).toBeVisible();
    const targetId = await target.getAttribute('data-element-id');
    await page.evaluate((id) => {
      const w = window as unknown as { __touched: string[] };
      w.__touched = [];
      const observer = new MutationObserver((records) => {
        for (const record of records) {
          const owner =
            (record.target as Node).parentElement?.closest('[data-element-id]') ??
            (record.target as HTMLElement).closest?.('[data-element-id]');
          const other = owner?.getAttribute('data-element-id');
          if (other && other !== id) w.__touched.push(other);
        }
      });
      observer.observe(document.querySelector('[data-testid="page"]') as Node, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
    }, targetId);
    const box = await target.boundingBox();
    if (!box) throw new Error('no box');
    await page.keyboard.down('Alt');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 20; i += 1)
      await page.mouse.move(box.x + box.width / 2 + i * 3, box.y + box.height / 2 + i * 2);
    await page.mouse.up();
    await page.keyboard.up('Alt');
    const touched = await page.evaluate(
      () => (window as unknown as { __touched: string[] }).__touched,
    );
    expect([...new Set(touched)]).toEqual([]);
  });

  test('dragging with 100 elements has no long tasks over 100ms in a dev build', async ({
    page,
  }) => {
    await startBuilder(page);
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: /Add 100 elements/ }).click();
    await expect(elements(page)).toHaveCount(100);
    await page.keyboard.press('Escape');
    const target = elements(page).last();
    await target.click({ force: true });
    await expect(page.locator('.moveable-control-box')).toBeVisible();
    await page.evaluate(() => {
      const w = window as unknown as { __long: number[] };
      w.__long = [];
      new PerformanceObserver((list) =>
        list.getEntries().forEach((e) => w.__long.push(e.duration)),
      ).observe({ type: 'longtask', buffered: false });
    });
    const box = await target.boundingBox();
    if (!box) throw new Error('no box');
    await page.keyboard.down('Alt');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 30; i += 1)
      await page.mouse.move(box.x + box.width / 2 + i * 2, box.y + box.height / 2 + i);
    await page.mouse.up();
    await page.keyboard.up('Alt');
    const longTasks = await page.evaluate(() => (window as unknown as { __long: number[] }).__long);
    expect(longTasks.filter((duration) => duration > 100)).toEqual([]);
  });
});
