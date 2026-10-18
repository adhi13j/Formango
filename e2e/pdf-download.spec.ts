import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { startBuilder } from './helpers';

async function useTemplate(page: Page, name: RegExp) {
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  await page.getByRole('button', { name }).click();
}

test.describe('PDF downloads', () => {
  test('the menu downloads a fillable PDF with real form fields named after the field keys', async ({
    page,
  }) => {
    await startBuilder(page);
    await useTemplate(page, /Event registration template/);
    await page.getByRole('button', { name: 'More actions' }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Download fillable PDF' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^event-registration-\d{4}-\d{2}-\d{2}\.pdf$/);
    const pdf = await PDFDocument.load(readFileSync((await file.path()) ?? ''));
    expect(pdf.getPageCount()).toBe(1);
    const names = pdf
      .getForm()
      .getFields()
      .map((field) => field.getName())
      .sort();
    expect(names).toEqual(
      [
        'dietary-needs__0',
        'dietary-needs__1',
        'dietary-needs__2',
        'dietary-needs__3',
        'email',
        'full-name',
        'ticket-type',
      ].sort(),
    );
  });

  test('the success screen downloads a copy of the answers', async ({ page }) => {
    await startBuilder(page);
    await useTemplate(page, /Contact form template/);
    await page.getByRole('button', { name: 'Preview' }).click();
    await page.getByLabel(/Your name/).fill('Asha Rao');
    await page.getByLabel(/Email/).fill('asha@example.com');
    await page.getByLabel(/Message/).fill('Hello there');
    await page.waitForTimeout(2100);
    await page.getByRole('button', { name: 'Send' }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download my copy (PDF)' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^contact-us-\d{4}-\d{2}-\d{2}\.pdf$/);
    const bytes = readFileSync((await file.path()) ?? '');
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toBe('Contact us');
  });

  test('warns when a character is missing from the font and still downloads', async ({ page }) => {
    await startBuilder(page);
    await useTemplate(page, /Contact form template/);
    await page.getByRole('button', { name: 'Preview' }).click();
    await page.getByLabel(/Your name/).fill('Asha 你好');
    await page.getByLabel(/Email/).fill('asha@example.com');
    await page.getByLabel(/Message/).fill('Hello there');
    await page.waitForTimeout(2100);
    await page.getByRole('button', { name: 'Send' }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download my copy (PDF)' }).click();
    await download;
    await expect(page.getByText(/replaced with "\?"/)).toBeVisible();
  });
});
