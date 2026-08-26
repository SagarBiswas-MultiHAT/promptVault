import {expect, test, type Page} from '@playwright/test';

/**
 * Baseline behaviour lock for the vault CRUD path. This suite must keep passing
 * unchanged through the Phase 3 refactor — that is what makes the refactor
 * provably behaviour-preserving.
 */

const TITLE = 'Playwright smoke prompt';
const BODY = 'Summarise the following text in exactly three bullet points.';
const STORAGE_KEY = 'prompt-vault-data';

async function addPrompt(page: Page, title: string, body: string) {
  await page.getByRole('button', {name: 'New Prompt', exact: true}).click();
  // The form is lazy-loaded behind Suspense, so wait for it rather than typing blind.
  await page.getByPlaceholder('A descriptive name for your prompt').fill(title);
  await page.getByPlaceholder('Type your prompt here...').fill(body);
  await page.getByRole('button', {name: 'Save Prompt'}).click();
}

/**
 * Wait until the write has actually reached `localStorage`.
 *
 * Do NOT wait on the app's "✓ Saved" indicator here. It is not tied to any
 * particular write: the persistence effect also runs on mount, so the indicator
 * lights up ~500ms after load and stays up for 2s. A test that waits for it right
 * after saving can be satisfied by that *mount* write and reload before the real
 * one lands — which is exactly how this test flaked. Asserting the stored bytes
 * is deterministic and checks the thing the reload actually depends on.
 */
async function waitForPersisted(page: Page, title: string) {
  await expect
    .poll(async () => page.evaluate((key) => window.localStorage.getItem(key) ?? '', STORAGE_KEY), {
      timeout: 5_000,
    })
    .toContain(title);
}

test.beforeEach(async ({page}) => {
  await page.goto('/');
  await expect(page.locator('#main-search-desktop')).toBeVisible();
});

test('creates a prompt and shows it in the grid', async ({page}) => {
  await addPrompt(page, TITLE, BODY);
  await expect(page.getByText(TITLE)).toBeVisible();
});

test('persists prompts across a reload', async ({page}) => {
  await addPrompt(page, TITLE, BODY);
  await expect(page.getByText(TITLE)).toBeVisible();
  await waitForPersisted(page, TITLE);

  await page.reload();
  await expect(page.getByText(TITLE)).toBeVisible();
});

test('filters the grid by search query', async ({page}) => {
  await addPrompt(page, TITLE, BODY);
  await addPrompt(page, 'Unrelated entry', 'Nothing to do with summaries.');

  await page.locator('#main-search-desktop').fill('summarise');
  await expect(page.getByText(TITLE)).toBeVisible();
  await expect(page.getByText('Unrelated entry')).toBeHidden();

  await page.locator('#main-search-desktop').fill('');
  await expect(page.getByText('Unrelated entry')).toBeVisible();
});

test('virtualizes large vaults without losing scroll access', async ({page}) => {
  const now = Date.now();
  await page.evaluate(({key, data}) => {
    window.localStorage.setItem(key, JSON.stringify(data));
  }, {
    key: STORAGE_KEY,
    data: {
      schemaVersion: '2.0.0',
      categories: [
        {id: 'cat-1', name: 'Coding', updatedAt: now, deletedAt: null},
      ],
      settings: {isDarkMode: true, sortBy: 'RECENTLY_ADDED'},
      prompts: Array.from({length: 260}, (_, index) => ({
        id: `prompt-${index}`,
        title: `Prompt ${index}`,
        body: `Body ${index}`,
        categoryId: 'cat-1',
        tags: ['bulk'],
        isFavorite: false,
        createdAt: now + index,
        updatedAt: now + index,
        usageCount: 0,
        deletedAt: null,
      })),
    },
  });

  await page.reload();
  await expect(page.getByText('Prompt 259')).toBeVisible();
  await expect.poll(() => page.getByRole('article').count()).toBeLessThan(80);

  await page.getByTestId('content-area').evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event('scroll', {bubbles: true}));
  });
  await expect(page.getByText('Prompt 0')).toBeVisible();
});

test('copies a prompt body to the clipboard', async ({page, context}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await addPrompt(page, TITLE, BODY);

  await page.getByRole('button', {name: /copy/i}).first().click();

  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toBe(BODY);
});

/**
 * Regression lock for the unload flush added in Phase 2.
 *
 * This was `test.fail` when written: the persistence effect debounced
 * `localStorage.setItem` by 500ms and nothing flushed it on unload, so closing or
 * reloading the tab inside that window lost the write outright, with no indication
 * that anything was pending. Phase 2 added the `pagehide` / `visibilitychange`
 * flush, so it now passes — and must keep passing.
 */
test('a prompt survives an immediate reload (no debounce data loss)', async ({page}) => {
  await addPrompt(page, TITLE, BODY);
  await expect(page.getByText(TITLE)).toBeVisible();

  // Deliberately do NOT wait for the "saved" indicator.
  await page.reload();
  await expect(page.getByText(TITLE)).toBeVisible({timeout: 3000});
});

test('a revisited vault reloads while offline', async ({page, context}) => {
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  // This controlled reload caches the navigation shell and its hashed assets.
  await page.reload();
  await expect(page.locator('#main-search-desktop')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await expect.poll(() => page.evaluate(async () => (await caches.open('promptvault-shell-v1')).keys().then(keys => keys.map(key => new URL(key.url).pathname).filter(path => path.startsWith('/assets/')).length))).toBeGreaterThan(3);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#main-search-desktop')).toBeVisible();
  await context.setOffline(false);
});
