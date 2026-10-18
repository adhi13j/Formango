import { expect, test, type Page } from '@playwright/test';
import { startBuilder } from './helpers';

async function useTemplate(page: Page, name: RegExp) {
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  await page.getByRole('button', { name: name }).click(); // an empty page applies it at once
}

async function fillContactForm(page: Page) {
  await page.getByLabel(/Your name/).fill('Asha Rao');
  await page.getByLabel(/Email/).fill('asha@example.com');
  await page.getByLabel(/Message/).fill('Hello there');
}

test.describe('fill form in preview', () => {
  test('shows errors under fields, focuses the first, and fixes them as you type', async ({
    page,
  }) => {
    await startBuilder(page);
    await useTemplate(page, /Contact form template/);
    await page.getByRole('button', { name: 'Preview' }).click();
    await page.waitForTimeout(2100); // the form refuses answers sent in under 2 seconds
    await page.getByRole('button', { name: 'Send' }).click();
    const name = page.getByLabel(/Your name/);
    await expect(page.getByText('This field is required', { exact: true })).toHaveCount(3);
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText(/3 fields need attention/)).toBeAttached();
    await name.fill('Asha');
    await expect(page.getByText('This field is required', { exact: true })).toHaveCount(2);
    const email = page.getByLabel(/Email/);
    await email.fill('not-an-email');
    await email.blur();
    await expect(page.getByText('Enter a valid email')).toBeVisible();
    await email.fill('asha@example.com');
    await expect(page.getByText('Enter a valid email')).toHaveCount(0);
  });

  test('a quick submit asks the person to wait instead of failing silently', async ({ page }) => {
    await startBuilder(page);
    await useTemplate(page, /Contact form template/);
    await page.getByRole('button', { name: 'Preview' }).click();
    await fillContactForm(page);
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByRole('alert')).toContainText('Please wait a moment');
  });

  test('a valid submit shows the success screen without saving, and starts over', async ({
    page,
  }) => {
    await startBuilder(page);
    await useTemplate(page, /Contact form template/);
    await page.getByRole('button', { name: 'Preview' }).click();
    await fillContactForm(page);
    await page.waitForTimeout(2100);
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByRole('heading', { name: 'That worked' })).toBeVisible();
    await page.getByRole('button', { name: 'Submit another response' }).click();
    await expect(page.getByLabel(/Your name/)).toHaveValue('');
  });

  test('keeps the answers when switching between desktop and phone', async ({ page }) => {
    await startBuilder(page);
    await useTemplate(page, /Contact form template/);
    await page.getByRole('button', { name: 'Preview' }).click();
    await page.getByLabel(/Your name/).fill('Asha');
    await page.getByRole('button', { name: 'Phone' }).click();
    await expect(page.getByLabel(/Your name/)).toHaveValue('Asha');
  });
});

test.describe('fill page for the saved design', () => {
  test('submits, shows the thanks screen, and keeps two responses after a reload', async ({
    page,
  }) => {
    await startBuilder(page);
    await useTemplate(page, /Contact form template/);
    await expect(page.getByTestId('save-status')).toHaveText(/Saved/);
    await page.goto('/fill/local');
    await expect(page).toHaveTitle('Contact us');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    for (let i = 0; i < 2; i += 1) {
      await fillContactForm(page);
      await page.waitForTimeout(2100);
      await page.getByRole('button', { name: 'Send' }).click();
      await expect(
        page.getByRole('heading', { name: 'Thanks, your response was recorded' }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Submit another response' }).click();
    }
    await page.reload();
    const saved = await page.evaluate(
      () =>
        new Promise<unknown[]>((resolve, reject) => {
          const open = indexedDB.open('keyval-store');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const get = open.result
              .transaction('keyval')
              .objectStore('keyval')
              .get('formango:builder:responses:v1');
            get.onsuccess = () => resolve(get.result as unknown[]);
            get.onerror = () => reject(get.error);
          };
        }),
    );
    expect(saved).toHaveLength(2);
  });

  test('says there is nothing to fill when no design was saved', async ({ page }) => {
    await page.goto('/fill/local');
    await expect(page.getByRole('heading', { name: 'No form to fill yet' })).toBeVisible();
  });

  test('fits a 390px phone with no sideways scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/builder');
    await page.setViewportSize({ width: 1360, height: 820 });
    await page.getByRole('button', { name: 'Create design' }).click();
    await useTemplate(page, /Contact form template/);
    await expect(page.getByTestId('save-status')).toHaveText(/Saved/);
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/fill/local');
    await expect(page.getByLabel(/Your name/)).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
