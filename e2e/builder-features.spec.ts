import { expect, test, type Page } from '@playwright/test';
import { addFromRail, dragBy, elements, startBuilder, submitButton } from './helpers';

test.describe('submit button', () => {
  test('every new form has one, near the bottom, and it cannot be deleted or duplicated', async ({
    page,
  }) => {
    await startBuilder(page);
    await expect(submitButton(page)).toHaveCount(1);
    await submitButton(page).click();
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Duplicate' })).toHaveCount(0);
    await page.keyboard.press('Delete');
    await page.keyboard.press('Control+d');
    await expect(submitButton(page)).toHaveCount(1);
  });

  test('can be moved and restyled, and the label shows in preview', async ({ page }) => {
    await startBuilder(page);
    await submitButton(page).click();
    const before = await submitButton(page).boundingBox();
    await dragBy(page, submitButton(page), 0, -100);
    const after = await submitButton(page).boundingBox();
    expect(Math.round((before?.y ?? 0) - (after?.y ?? 0))).toBe(100);
    await page.getByRole('textbox', { name: 'Button text' }).fill('Send it');
    await page.getByRole('textbox', { name: 'Button text' }).press('Enter');
    await page.getByRole('button', { name: 'Preview' }).click();
    await expect(page.getByRole('button', { name: 'Send it' })).toBeVisible();
  });

  test('stays at the end of a mobile form when fields are added', async ({ page }) => {
    await startBuilder(page);
    for (let i = 0; i < 8; i += 1) await addFromRail(page, 'Fields', /Long text/);
    const button = await submitButton(page).boundingBox();
    const last = await elements(page).last().boundingBox();
    expect((button?.y ?? 0) >= (last?.y ?? 0) + (last?.height ?? 0)).toBe(true);
  });
});

test.describe('filled boxes turn green', () => {
  test('a text box gets a green border once it has an answer, and loses it when cleared', async ({
    page,
  }) => {
    await startBuilder(page);
    await addFromRail(page, 'Fields', /Short text/);
    await page.getByRole('button', { name: 'Preview' }).click();
    const input = page.getByLabel('Short answer');
    await expect(input).toHaveCSS('border-top-color', 'rgb(165, 139, 106)');
    await input.fill('Asha');
    await expect(input).toHaveCSS('border-top-color', 'rgb(76, 154, 42)');
    await input.fill('');
    await expect(input).toHaveCSS('border-top-color', 'rgb(165, 139, 106)');
  });
});

test.describe('file upload field', () => {
  test('accepts an allowed file, shows its name, and can remove it', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Fields', /File upload/);
    await page.getByRole('button', { name: 'Preview' }).click();
    const input = page.getByLabel('Upload a file');
    await input.setInputFiles({
      name: 'cv.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4'),
    });
    await expect(page.getByText('cv.pdf')).toBeVisible();
    await page.getByRole('button', { name: 'Remove cv.pdf' }).click();
    await expect(page.getByText('cv.pdf')).toHaveCount(0);
  });

  test('rejects the wrong type and files over the size limit with a clear message', async ({
    page,
  }) => {
    await startBuilder(page);
    await addFromRail(page, 'Fields', /File upload/);
    await page.getByRole('button', { name: 'File rules' }).click();
    await page.getByLabel('Largest file in megabytes').fill('1');
    await page.getByLabel('Largest file in megabytes').press('Enter');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Preview' }).click();
    const input = page.getByLabel('Upload a file');
    await input.setInputFiles({
      name: 'sheet.xlsx',
      mimeType: 'application/vnd.ms-excel',
      buffer: Buffer.from('x'),
    });
    await expect(page.getByRole('alert')).toContainText('not allowed');
    await input.setInputFiles({
      name: 'big.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(1024 * 1024 + 1),
    });
    await expect(page.getByRole('alert')).toContainText('limit is 1 MB');
    await expect(page.getByText('big.pdf')).toHaveCount(0);
  });

  test('file rules can switch which kinds are allowed', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Fields', /File upload/);
    await page.getByRole('button', { name: 'File rules' }).click();
    await page.getByRole('checkbox', { name: /Documents/ }).check();
    await expect(page.getByText(/Shown as: Images, PDF, Documents/)).toBeVisible();
  });
});

test.describe('layout grid', () => {
  test('the grid button shows the columns on the page', async ({ page }) => {
    await startBuilder(page);
    await expect(page.getByTestId('grid-overlay')).toHaveCount(0);
    await page.getByRole('button', { name: /layout grid/i }).click();
    await expect(page.getByTestId('grid-overlay')).toBeVisible();
  });
});

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

test.describe('signature field', () => {
  async function previewSignature(page: Page) {
    await startBuilder(page);
    await addFromRail(page, 'Fields', /Signature/);
    await page.getByRole('button', { name: 'Preview' }).click();
    return page.getByRole('group', { name: /Signature/ });
  }

  test('can be drawn with the mouse, turns green, and Clear empties it', async ({ page }) => {
    const group = await previewSignature(page);
    await expect(page.getByRole('button', { name: 'Clear' })).toHaveCount(0);
    const canvas = page.getByLabel('Signature drawing area');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('no canvas');
    await page.mouse.move(box.x + 30, box.y + 30);
    await page.mouse.down();
    await page.mouse.move(box.x + 90, box.y + 60, { steps: 6 });
    await page.mouse.move(box.x + 150, box.y + 30, { steps: 6 });
    await page.mouse.up();
    await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible();
    await expect(group).toHaveCSS('border-top-color', 'rgb(76, 154, 42)');
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByRole('button', { name: 'Clear' })).toHaveCount(0);
  });

  test('can be typed, which works without a mouse', async ({ page }) => {
    await previewSignature(page);
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    await page.getByLabel('Type your name to sign').fill('Asha Rao');
    await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible();
    await page.getByLabel('Type your name to sign').fill('');
    await expect(page.getByRole('button', { name: 'Clear' })).toHaveCount(0);
  });

  test('can be uploaded as an image', async ({ page }) => {
    await previewSignature(page);
    await page.getByRole('button', { name: 'Upload', exact: true }).click();
    await page
      .locator('input[accept^="image/png"]')
      .setInputFiles({ name: 'sig.png', mimeType: 'image/png', buffer: TINY_PNG });
    await expect(page.getByAltText('Your signature')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible();
  });
});
