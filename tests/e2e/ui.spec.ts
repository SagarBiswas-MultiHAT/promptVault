import {expect, test, type Page} from '@playwright/test';

/**
 * Covers the Phase 2 UI: the two features the README claimed but never shipped
 * (sort order, theme toggle) and the in-app dialogs that replaced `window.prompt`
 * / `confirm` / `alert`.
 *
 * The native dialogs are also *why* these tests can exist at all. Playwright
 * auto-dismisses `window.confirm`, so the old category-delete path could not be
 * exercised without registering a dialog handler, and `window.prompt` could not be
 * driven at all in the way a user drives it.
 */

const STORAGE_KEY = 'prompt-vault-data';

async function readVault(page: Page): Promise<Record<string, unknown>> {
  const raw = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

async function addPrompt(page: Page, title: string, body: string) {
  await page.getByRole('button', {name: 'New Prompt', exact: true}).click();
  await page.getByPlaceholder('A descriptive name for your prompt').fill(title);
  await page.getByPlaceholder('Type your prompt here...').fill(body);
  await page.getByRole('button', {name: 'Save Prompt'}).click();
}

test.beforeEach(async ({page}) => {
  await page.goto('/');
  await expect(page.locator('#main-search-desktop')).toBeVisible();
});

test('the sort control reorders the grid and the choice survives a reload', async ({page}) => {
  // Created oldest-first, so "Recently added" shows them in reverse.
  await addPrompt(page, 'Alpha entry', 'first');
  await addPrompt(page, 'Zulu entry', 'second');

  const titles = page.locator('[role="article"] h3');
  await expect(titles).toHaveText(['Zulu entry', 'Alpha entry']);

  await page.locator('#sort-prompts').selectOption('A_Z');
  await expect(titles).toHaveText(['Alpha entry', 'Zulu entry']);

  await expect.poll(async () => (await readVault(page)).settings).toMatchObject({sortBy: 'A_Z'});

  await page.reload();
  await expect(page.locator('#sort-prompts')).toHaveValue('A_Z');
  await expect(titles).toHaveText(['Alpha entry', 'Zulu entry']);
});

test('the theme toggle flips the theme and applies it before first paint', async ({page}) => {
  const html = page.locator('html');
  await expect(html).not.toHaveClass(/light/);

  await page.getByRole('button', {name: 'Switch to light theme'}).click();
  await expect(html).toHaveClass(/light/);

  await expect.poll(async () => (await readVault(page)).settings).toMatchObject({isDarkMode: false});

  // `public/theme-init.js` runs synchronously in <head>. Asserting on the very
  // first commit (`domcontentloaded`, before React has hydrated) is what proves
  // there is no dark flash for light-theme users.
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await expect(html).toHaveClass(/light/);

  await page.getByRole('button', {name: 'Switch to dark theme'}).click();
  await expect(html).not.toHaveClass(/light/);
});

test('creating a category uses an in-app dialog, not window.prompt', async ({page}) => {
  // If a native prompt were still in use this would fire and the test would fail:
  // Playwright dismisses dialogs by default, so `window.prompt` returns null.
  let nativeDialog = false;
  page.on('dialog', () => {
    nativeDialog = true;
  });

  await page.getByRole('button', {name: 'Add new category'}).click();
  await page.getByLabel('Category name').fill('Research');
  // `exact` because the Settings modal also has a "Create PIN" button.
  await page.getByRole('button', {name: 'Create', exact: true}).click();

  await expect(page.getByRole('button', {name: /Research/})).toBeVisible();
  expect(nativeDialog).toBe(false);
});

test('deleting a category asks first, and cancelling keeps it', async ({page}) => {
  let nativeDialog = false;
  page.on('dialog', () => {
    nativeDialog = true;
  });

  const coding = page.getByRole('button', {name: /^Coding/});
  await coding.hover();
  await page.getByTitle('Delete category').first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Coding');
  await dialog.getByRole('button', {name: 'Cancel'}).click();
  await expect(coding).toBeVisible();

  await coding.hover();
  await page.getByTitle('Delete category').first().click();
  await page.getByRole('dialog').getByRole('button', {name: 'Delete'}).click();
  await expect(coding).toBeHidden();

  expect(nativeDialog).toBe(false);
});

test('a malformed import file is reported field by field, not as a bare alert', async ({page}) => {
  let nativeDialog = false;
  page.on('dialog', () => {
    nativeDialog = true;
  });

  await page.getByRole('button', {name: 'Settings'}).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    // Has a version, so the old code passed the only check it made and then threw
    // inside setData — after its own catch block had already returned.
    buffer: Buffer.from(JSON.stringify({schemaVersion: '1.0.0'})),
  });

  // Import can stack over Settings, but only the top dialog should claim modal
  // ownership for assistive tech and keyboard handling.
  const dialog = page.getByRole('dialog').filter({hasText: 'Import Failed'});
  await expect(dialog).toBeVisible();
  await expect(page.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(1);
  await expect(dialog).toContainText('"prompts" is missing or is not a list.');
  await expect(dialog).toContainText('"categories" is missing or is not a list.');
  await expect(dialog).toContainText('"settings" is missing.');
  expect(nativeDialog).toBe(false);
});

test('a modal traps focus and Escape restores its trigger', async ({page}) => {
  const trigger = page.getByRole('button', {name: 'Settings'});
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('an export carries no encryption secret or recovery key', async ({page}) => {
  await addPrompt(page, 'Exportable', 'body text');

  await page.getByRole('button', {name: 'Settings'}).click();
  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', {name: /Export/}).click(),
  ]).then(([event]) => event);

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const rawExport = Buffer.concat(chunks).toString('utf8');
  const exported = JSON.parse(rawExport) as {
    settings: Record<string, unknown>;
    prompts: {title: string}[];
  };

  expect(exported.settings).not.toHaveProperty('pinHash');
  expect(rawExport).not.toContain('recovery');
  expect(exported.prompts.map((p) => p.title)).toContain('Exportable');
});
