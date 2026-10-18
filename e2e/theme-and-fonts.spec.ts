import { expect, test } from '@playwright/test';

test('uses mango theme tokens with dark ink on the primary button', async ({ page }) => {
  await page.goto('/dev/theme');
  const button = page.getByRole('button', { name: 'Primary action' });
  await expect(button).toHaveCSS('background-color', 'rgb(255, 159, 28)');
  await expect(button).toHaveCSS('color', 'rgb(42, 24, 5)');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 252, 247)');
});

test('serves every font from our own origin and loads them all', async ({ page, baseURL }) => {
  const fontRequests: string[] = [];
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== baseURL) externalRequests.push(request.url());
    if (url.pathname.startsWith('/fonts/')) fontRequests.push(url.pathname);
  });

  await page.goto('/dev/theme');
  await expect(page.locator('main')).toHaveAttribute('data-fonts', 'ready');

  expect(externalRequests).toEqual([]);
  expect(fontRequests.length).toBeGreaterThanOrEqual(14);
  expect(fontRequests.every((path) => path.endsWith('.woff2'))).toBe(true);

  const missing = await page.evaluate(() => {
    const families = [
      'DM Sans',
      'Inter',
      'Poppins',
      'Playfair Display',
      'Lora',
      'Space Grotesk',
      'Caveat',
    ];
    return families.flatMap((family) =>
      [400, 700]
        .filter((weight) => !document.fonts.check(`${weight} 16px "${family}"`))
        .map((weight) => `${weight} ${family}`),
    );
  });
  expect(missing).toEqual([]);
});

test('form text uses precise, kerning-free rendering so it can match the PDF', async ({ page }) => {
  await page.goto('/dev/theme');
  await expect(page.locator('main')).toHaveAttribute('data-fonts', 'ready');
  const sample = page.locator('[data-font-id="poppins"]');
  await expect(sample).toHaveCSS('text-rendering', 'geometricprecision');
  await expect(sample).toHaveCSS('font-kerning', 'none');
  await expect(sample).toHaveCSS('font-variant-ligatures', 'none');
});
