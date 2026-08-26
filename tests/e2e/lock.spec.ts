import { expect, test, type Page } from '@playwright/test';

const PIN = '1234';
const SECRET = 'CANARY-do-not-store-me-in-plaintext';
const STORAGE_KEY = 'prompt-vault-data';

async function protect(page: Page) {
  await page.getByTitle('Encrypt vault').click();
  await expect(page.getByRole('heading', { name: 'Protect this vault' })).toBeVisible();
  await page.getByRole('textbox', { name: 'PIN', exact: true }).fill(PIN);
  await page.getByLabel('Confirm PIN').fill(PIN);
  await page.getByRole('button', { name: 'Encrypt vault' }).click();
  await expect(page.getByRole('heading', { name: 'Save your recovery key' })).toBeVisible();
  await page.getByRole('button', { name: 'I saved it securely' }).click();
  await expect(page.getByRole('heading', { name: 'Protect this vault' })).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#main-search-desktop')).toBeVisible();
});

test('encrypts local storage, locks on reload, rejects a wrong secret, then unlocks', async ({ page }) => {
  await page.getByRole('button', { name: 'New Prompt', exact: true }).click();
  await page.getByPlaceholder('A descriptive name for your prompt').fill('Canary');
  await page.getByPlaceholder('Type your prompt here...').fill(SECRET);
  await page.getByRole('button', { name: 'Save Prompt' }).click();
  await protect(page);
  await expect.poll(() => page.evaluate(key => window.localStorage.getItem(key) ?? '', STORAGE_KEY)).not.toContain(SECRET);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Vault Locked' })).toBeVisible();
  await page.getByRole('textbox', { name: 'PIN', exact: true }).fill('9876');
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByRole('alert')).toContainText(/Incorrect pin/i);
  await page.getByRole('textbox', { name: 'PIN', exact: true }).fill(PIN);
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByRole('heading', { name: 'Canary' })).toBeVisible();
});
