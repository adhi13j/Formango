import { expect, test } from '@playwright/test';

// Talks to the real Supabase project in .env.local and creates a throwaway account, so it only
// runs on request: E2E_CLOUD=1 npx playwright test e2e/cloud.spec.ts --project=chromium
test.skip(!process.env.E2E_CLOUD, 'needs the real Supabase project');
test.setTimeout(120_000);

test('sign up, build, publish, fill as a stranger, and read the response', async ({
  page,
  browser,
}) => {
  const stamp = Date.now().toString(36);
  await page.setViewportSize({ width: 1360, height: 820 });

  // /forms asks for an account and brings us back afterwards.
  await page.goto('/forms');
  await expect(page).toHaveURL(/\/login\?redirectTo=%2Fforms/);
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Email').fill(`formango.e2e.${stamp}@gmail.com`);
  await page.getByLabel('Password').fill(`E2e-${stamp}-pass`);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByRole('heading', { name: 'Your forms' })).toBeVisible();

  // New form, add a field and a repeating group, and see it survive a reload.
  await page.getByRole('button', { name: 'New form' }).first().click();
  await page.getByRole('button', { name: 'Create form' }).click();
  await expect(page.getByTestId('page')).toBeVisible();
  await page.getByRole('button', { name: 'Fields', exact: true }).click();
  await page
    .getByRole('button', { name: /Short text/ })
    .first()
    .click();
  await page
    .getByRole('button', { name: /Repeating group/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Close panel' }).click();
  await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 15_000 });
  const editUrl = page.url();
  await page.reload();
  await expect(page.getByText('Short answer')).toBeVisible();
  await expect(page.getByText('Add person')).toBeVisible();

  // Publish.
  await page.getByRole('button', { name: 'Publish' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Publish' }).click();
  const link = await page.getByLabel('Public link').inputValue();
  expect(link).toMatch(/\/f\/[0-9a-z]{8}$/);
  await page.keyboard.press('Escape');

  // A stranger (fresh browser, no account) fills it in.
  const stranger = await browser.newContext();
  const guest = await stranger.newPage();
  await guest.goto(link);
  await expect(guest.getByLabel('Short answer')).toBeVisible();
  await guest.getByLabel('Short answer').fill('Asha Rao');
  await guest.getByRole('button', { name: 'Add person' }).click();
  await guest.getByLabel(/^Name/).fill('Ravi Rao');
  await guest.getByLabel(/^Relationship/).fill('Father');
  await guest.waitForTimeout(2200);
  await guest.getByRole('button', { name: 'Submit' }).click();
  await expect(
    guest.getByRole('heading', { name: 'Thanks, your response was recorded' }),
  ).toBeVisible();
  // ...and cannot open the editor.
  await guest.goto(editUrl);
  await expect(guest).toHaveURL(/\/login/);
  await stranger.close();

  // The owner sees the response and can export it.
  await page.goto(editUrl.replace('/edit', '/responses'));
  await expect(page.getByText('Asha Rao')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await download).suggestedFilename()).toMatch(/-responses-\d{4}-\d{2}-\d{2}\.csv$/);
  await page.getByRole('button', { name: /\d/ }).first().click();
  await expect(page.getByText('Person 1', { exact: true })).toBeVisible();

  // Delete the form from My forms.
  await page.goto('/forms');
  await page
    .getByRole('button', { name: /^Actions for/ })
    .first()
    .click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText(/Deleted/)).toBeVisible();
});

test('two tabs editing one form show the conflict banner, and Overwrite resolves it', async ({
  page,
  context,
}) => {
  const stamp = Date.now().toString(36);
  await page.setViewportSize({ width: 1360, height: 820 });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Email').fill(`formango.tabs.${stamp}@gmail.com`);
  await page.getByLabel('Password').fill(`E2e-${stamp}-pass`);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByRole('button', { name: 'New form' }).first().click();
  await page.getByRole('button', { name: 'Create form' }).click();
  await expect(page.getByTestId('page')).toBeVisible();
  const url = page.url();

  const other = await context.newPage();
  await other.setViewportSize({ width: 1360, height: 820 });
  await other.goto(url);
  await expect(other.getByTestId('page')).toBeVisible();

  const addField = async (tab: typeof page) => {
    await tab.getByRole('button', { name: 'Fields', exact: true }).click();
    await tab
      .getByRole('button', { name: /Short text/ })
      .first()
      .click();
    await tab.getByRole('button', { name: 'Close panel' }).click();
  };
  await addField(page);
  await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 15_000 });
  await addField(other);
  await expect(other.getByText(/changed in another tab/)).toBeVisible({ timeout: 15_000 });
  await other.getByRole('button', { name: 'Overwrite' }).click();
  await expect(other.getByTestId('save-status')).toHaveText('Saved', { timeout: 15_000 });
  await expect(other.getByText(/changed in another tab/)).toHaveCount(0);

  await page.goto('/forms');
  await page
    .getByRole('button', { name: /^Actions for/ })
    .first()
    .click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
});
