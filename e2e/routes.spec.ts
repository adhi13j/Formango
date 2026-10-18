import { expect, test } from '@playwright/test';

test('landing route renders with its own title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Formango');
  await expect(page.getByRole('heading', { name: 'Landing' })).toBeVisible();
});

test('builder route renders with its own title', async ({ page }) => {
  await page.goto('/builder');
  await expect(page).toHaveTitle('Builder | Formango');
  await expect(page.getByRole('heading', { name: 'Builder' })).toBeVisible();
});

test('unknown routes show a friendly page with a link home', async ({ page }) => {
  await page.goto('/this-does-not-exist');
  await expect(page).toHaveTitle('Page not found | Formango');
  await page.getByRole('link', { name: 'Go home' }).click();
  await expect(page).toHaveURL('/');
});

for (const path of ['/', '/builder', '/dev/theme', '/missing']) {
  test(`${path} declares English and logs no console errors or warnings`, async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') problems.push(message.text());
    });
    page.on('pageerror', (error) => problems.push(error.message));
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1').first()).toBeVisible();
    expect(problems).toEqual([]);
  });
}
