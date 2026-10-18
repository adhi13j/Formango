import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { startBuilder } from './helpers';

/** Runs axe against the page and returns a short, readable list of what failed. */
async function violations(page: Page): Promise<string[]> {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return result.violations.map(
    (v) =>
      `${v.id}: ${v.help} (${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(' '))
        .join(' | ')})`,
  );
}

test.describe('accessibility (axe, WCAG 2.1 A and AA)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'axe runs in one browser');

  test('landing page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Design a form/ })).toBeVisible();
    await page.waitForTimeout(1200);
    expect(await violations(page)).toEqual([]);
  });

  test('landing page on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Design a form/ })).toBeVisible();
    await page.waitForTimeout(1200);
    expect(await violations(page)).toEqual([]);
  });

  test('login and privacy', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    expect(await violations(page)).toEqual([]);
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy' })).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });

  test('builder shell with a selected field', async ({ page }) => {
    await startBuilder(page);
    await page.getByRole('button', { name: 'Fields', exact: true }).click();
    await page
      .getByRole('button', { name: /Short text/ })
      .first()
      .click();
    await page.getByRole('button', { name: 'Close panel' }).click();
    expect(await violations(page)).toEqual([]);
  });

  test('the fill page, empty and with errors', async ({ page }) => {
    await startBuilder(page);
    await page.getByRole('button', { name: 'Templates', exact: true }).click();
    await page.getByRole('button', { name: /Insurance proposal info template/ }).click();
    await expect(page.getByTestId('save-status')).toHaveText(/Saved/);
    await page.goto('/fill/local');
    await expect(page.getByLabel(/Full name/)).toBeVisible();
    expect(await violations(page)).toEqual([]);
    await page.waitForTimeout(2100);
    await page.getByRole('button', { name: 'Send to my officer' }).click();
    await expect(page.getByText('This field is required').first()).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });
});
