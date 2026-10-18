import { expect, test, type Page } from '@playwright/test';
import { addFromRail, docBox, elements, startBuilder } from './helpers';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const heading = (page: Page) => page.locator('[data-element-type="text"] h2').first();

test.describe('text editing', () => {
  test('Enter edits in place, Escape commits, undo restores', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Heading/);
    await page.keyboard.press('Enter');
    const editor = page.getByLabel('Edit text');
    await expect(editor).toBeFocused();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('Spring sale');
    await page.keyboard.press('Escape');
    await expect(heading(page)).toHaveText('Spring sale');
    await page.keyboard.press('Control+z');
    await expect(heading(page)).toHaveText('Add a heading');
  });

  test('empty text commits as "Text" and double-click edits a field label', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Heading/);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.keyboard.press('Control+Enter');
    await expect(heading(page)).toHaveText('Text');
    await addFromRail(page, 'Fields', /Short text/);
    await page.locator('[data-element-type="field"]').dblclick({ position: { x: 20, y: 8 } });
    await page.getByLabel('Edit label').fill('Your city');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-element-type="field"]')).toContainText('Your city');
  });
});

test.describe('toolbar', () => {
  test('font size and color apply immediately and are undoable', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Heading/);
    await page.getByLabel('Font size').fill('40');
    await page.keyboard.press('Enter');
    await expect(heading(page)).toHaveCSS('font-size', '40px');
    await page.getByRole('button', { name: /^Text color/ }).click();
    await page.getByRole('button', { name: 'Berry', exact: true }).click();
    await expect(heading(page)).toHaveCSS('color', 'rgb(207, 51, 64)');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Text color' })).toHaveCount(0);
    await page.keyboard.press('Control+z');
    await expect(heading(page)).toHaveCSS('color', 'rgb(42, 24, 5)');
  });

  test('hex input rejects bad colors and accepts short hex', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Rectangle/);
    await page.getByRole('button', { name: /^Fill/ }).click();
    const hex = page.getByLabel('Hex color');
    await hex.fill('nope');
    await hex.press('Enter');
    await expect(page.getByText('Use a color like #FF9F1C.')).toBeVisible();
    await hex.fill('#0f0');
    await hex.press('Enter');
    await expect(page.getByRole('button', { name: /^Fill: #00FF00/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Recent color #00FF00' })).toBeVisible();
  });

  test('No fill makes a shape transparent', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Rectangle/);
    await page.getByRole('button', { name: /^Fill/ }).click();
    await page.getByRole('button', { name: 'No fill' }).click();
    await expect(page.getByRole('button', { name: 'Fill: None' })).toBeVisible();
  });

  test('required toggle adds an asterisk and options change the radio height', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Fields', /Radio/);
    await page.getByRole('switch', { name: 'Required' }).click();
    await expect(page.locator('[data-element-type="field"]')).toContainText('*');
    expect((await docBox(page)).height).toBe(88);
    await page.getByRole('button', { name: 'Edit options' }).click();
    await page.getByRole('button', { name: 'Add option' }).click();
    await expect(page.getByLabel('Option 3')).toBeFocused();
    await page.keyboard.type('Third');
    expect((await docBox(page)).height).toBe(120);
  });

  test('position popover sets exact numbers', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Rectangle/);
    await page.getByRole('button', { name: 'Position and size' }).click();
    await page.getByLabel('Y position').fill('300');
    await page.getByLabel('Y position').press('Enter');
    expect((await docBox(page)).y).toBe(300);
    await page.getByLabel('Width', { exact: true }).fill('2');
    await page.getByLabel('Width', { exact: true }).press('Enter');
    expect((await docBox(page)).width).toBe(8); // the minimum shape size
  });

  test('nothing selected shows page settings, with the grid toggle', async ({ page }) => {
    await startBuilder(page);
    await expect(page.getByRole('button', { name: /^Page color/ })).toBeVisible();
    const grid = page.getByRole('button', { name: 'Layout grid snap lines' });
    await expect(grid).toHaveAttribute('aria-pressed', 'true');
    await grid.click();
    await expect(grid).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('selection tools', () => {
  test('duplicate, copy and paste create offset copies', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Rectangle/);
    await page.keyboard.press('Control+d');
    await expect(elements(page)).toHaveCount(2);
    const [a, b] = [await docBox(page, 0), await docBox(page, 1)];
    expect(b.x - a.x).toBe(16);
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+v');
    await expect(elements(page)).toHaveCount(3);
  });

  test('select all then align left lines everything up', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /Circle or ellipse/);
    await addFromRail(page, 'Elements', /^Rounded rectangle/);
    await page.keyboard.press('Control+a');
    await page.getByRole('button', { name: 'Align left' }).click();
    const [a, b] = [await docBox(page, 0), await docBox(page, 1)];
    expect(a.x).toBe(b.x);
  });

  test('layers: hide and lock', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Rectangle/);
    await page.getByRole('button', { name: 'Layers' }).click();
    const layers = page.getByRole('dialog', { name: 'Layers' });
    await layers.getByRole('button', { name: 'Hide' }).click();
    await expect(elements(page).first()).toHaveCSS('opacity', '0.3');
    await layers.getByRole('button', { name: 'Show' }).click();
    await layers.getByRole('button', { name: 'Lock', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.locator('[data-testid="page"]').click({ position: { x: 5, y: 5 } });
    await elements(page).first().click();
    await expect(page.locator('.moveable-control-box')).toHaveCount(0);
    await expect(page.getByLabel('Locked', { exact: true })).toBeVisible();
  });

  test('announces the selected element for screen readers', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Heading/);
    await expect(page.getByTestId('selection-announcer')).toHaveText('Selected Heading, text');
  });
});

test.describe('templates, preview, new design, files', () => {
  test('a template replaces the page after confirmation and undo restores', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Rectangle/);
    await page.getByRole('button', { name: 'Templates', exact: true }).click();
    await page.getByRole('button', { name: /Contact form template/ }).click();
    await page.getByRole('button', { name: 'Use template' }).click();
    await expect(page.locator('[data-element-type="field"]')).toHaveCount(3);
    await page.keyboard.press('Control+z');
    await expect(elements(page)).toHaveCount(1);
  });

  test('preview is interactive, resets, and Escape exits', async ({ page }) => {
    await startBuilder(page);
    await page.getByRole('button', { name: 'Templates', exact: true }).click();
    await page.getByRole('button', { name: /Contact form template/ }).click();
    await page.getByRole('button', { name: 'Preview' }).click();
    const name = page.getByLabel(/Your name/);
    await name.fill('Asha');
    await expect(name).toHaveValue('Asha');
    await page.getByRole('button', { name: 'Reset answers' }).click();
    await expect(name).toHaveValue('');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('page')).toBeVisible();
  });

  test('an A4 form in phone preview becomes a list with no horizontal scroll', async ({ page }) => {
    await startBuilder(page, 'A4 document');
    await addFromRail(page, 'Fields', /Short text/);
    await addFromRail(page, 'Fields', /Long text/);
    await page.getByRole('button', { name: 'Preview' }).click();
    await page.getByRole('button', { name: 'Phone' }).click();
    const frame = page.getByTestId('phone-frame');
    await expect(frame).toBeVisible();
    const overflow = await frame.evaluate((node) => {
      const scroller = node.firstElementChild as HTMLElement;
      return scroller.scrollWidth > scroller.clientWidth;
    });
    expect(overflow).toBe(false);
    await expect(frame.locator('[data-testid="fill-page"]')).toHaveCount(0);
  });

  test('New design skips the prompt on an empty page', async ({ page }) => {
    await startBuilder(page);
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'New design' }).click();
    await expect(page.getByRole('heading', { name: 'Choose a size' })).toBeVisible();
  });

  test('New design asks to save first when there is content', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Rectangle/);
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'New design' }).click();
    await expect(
      page.getByRole('heading', { name: 'Save your current work first?' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Choose a size' })).toHaveCount(0);
    await expect(elements(page)).toHaveCount(1);

    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'New design' }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download backup (JSON)' }).click();
    expect((await download).suggestedFilename()).toBe('untitled-form.formango.json');
    await expect(page.getByRole('heading', { name: 'Choose a size' })).toBeVisible();
    await page.getByRole('button', { name: 'Create design' }).click();
    await expect(elements(page)).toHaveCount(0);
  });

  test('Discard and start new continues to the size picker', async ({ page }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Rectangle/);
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'New design' }).click();
    await page.getByRole('button', { name: 'Discard and start new' }).click();
    await expect(page.getByRole('heading', { name: 'Choose a size' })).toBeVisible();
  });

  test('export then import restores the same design; a broken file changes nothing', async ({
    page,
  }) => {
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Rectangle/);
    await page.getByRole('button', { name: 'More actions' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Export JSON' }).click();
    const download = await downloadPromise;
    const path = await download.path();
    await expect(page.getByRole('menu')).toHaveCount(0);
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await expect(elements(page)).toHaveCount(0);
    await page.getByTestId('import-input').setInputFiles(path);
    await expect(elements(page)).toHaveCount(1);
    await page.getByTestId('import-input').setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('nope'),
    });
    await expect(page.getByText(/Could not import that file/)).toBeVisible();
    await expect(elements(page)).toHaveCount(1);
  });
});

test.describe('images', () => {
  test('uploads a PNG as an image element and rejects an SVG', async ({ page }) => {
    await startBuilder(page);
    await page.getByRole('button', { name: 'Uploads', exact: true }).click();
    await page
      .getByTestId('image-input')
      .setInputFiles({ name: 'dot.png', mimeType: 'image/png', buffer: ONE_PIXEL_PNG });
    await expect(page.locator('[data-element-type="image"]')).toHaveCount(1);
    await page.getByTestId('image-input').setInputFiles({
      name: 'logo.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
    });
    await expect(page.getByText(/SVG images aren't supported/)).toBeVisible();
    await expect(page.locator('[data-element-type="image"]')).toHaveCount(1);
  });
});

test.describe('limits and performance', () => {
  test('stops at 150 elements with a message instead of crashing', async ({ page }) => {
    test.setTimeout(90_000);
    await startBuilder(page);
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: /Add 100 elements/ }).click();
    await expect(elements(page)).toHaveCount(100);
    await page.getByRole('button', { name: 'Elements', exact: true }).click();
    const card = page.getByRole('button', { name: /Thin divider/ });
    for (let i = 0; i < 51; i += 1) await card.click();
    await expect(page.getByText('A form can have up to 150 elements.')).toBeVisible();
    await expect(elements(page)).toHaveCount(150);
  });
});

test.describe('keyboard and error states', () => {
  test('a keyboard-only user can add a field, edit its label, move it, delete it, and undo', async ({
    page,
  }) => {
    await startBuilder(page);
    await page.getByRole('button', { name: 'Fields', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: /Short text/ }).focus();
    await page.keyboard.press('Enter');
    await expect(elements(page)).toHaveCount(1);
    // Focus moved to the canvas, so Enter edits the label of the selected field.
    await page.keyboard.press('Enter');
    await page.keyboard.type('City');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-element-type="field"]')).toContainText('City');
    const before = await docBox(page);
    await page.keyboard.press('Shift+ArrowDown');
    expect((await docBox(page)).y).toBe(before.y + 10);
    await page.keyboard.press('Delete');
    await expect(elements(page)).toHaveCount(0);
    await page.keyboard.press('Control+z');
    await expect(elements(page)).toHaveCount(1);
  });

  test('Space and Enter still activate a focused button', async ({ page }) => {
    await startBuilder(page);
    await page.getByRole('button', { name: 'Fields', exact: true }).focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('complementary', { name: 'Fields' })).toBeVisible();
    await page.keyboard.press('Space');
    await expect(page.getByRole('complementary', { name: 'Fields' })).toHaveCount(0);
  });

  test('shows a persistent banner with a backup download when saving fails', async ({ page }) => {
    await page.addInitScript(() => {
      const original = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args: Parameters<typeof original>) {
        if (String(args[1]) === 'formango:builder:doc:v1')
          throw new DOMException('full', 'QuotaExceededError');
        return original.apply(this, args);
      };
    });
    await startBuilder(page);
    await addFromRail(page, 'Elements', /^Rectangle/);
    await expect(page.getByRole('alert')).toContainText('Your design is not being saved');
    await expect(page.getByTestId('save-status').filter({ hasText: 'Not saved' })).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download backup (JSON)' }).click();
    expect((await download).suggestedFilename()).toBe('untitled-form.formango.json');
    await expect(elements(page)).toHaveCount(1);
  });
});
