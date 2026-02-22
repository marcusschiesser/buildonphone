import { expect, test } from '@playwright/test';

const PROMPT = 'Create a ci smoke notes app with add and delete.';
const FAKE_MARKER = 'CI_FAKE_APP_READY';

async function clearClientStorage(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();

    const idb = indexedDB as IDBFactory & {
      databases?: () => Promise<Array<{ name?: string }>>;
    };

    if (idb.databases) {
      const dbs = await idb.databases();
      await Promise.all(
        dbs
          .map((db) => db.name)
          .filter((name): name is string => Boolean(name))
          .map(
            (name) =>
              new Promise<void>((resolve) => {
                const request = indexedDB.deleteDatabase(name);
                request.onsuccess = () => resolve();
                request.onerror = () => resolve();
                request.onblocked = () => resolve();
              })
          )
      );
      return;
    }

    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('claw2go');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });
}

test('background generation survives navigation without Anthropic key', async ({ page }) => {
  await clearClientStorage(page);

  await page.goto('/create');
  await page.getByRole('textbox').fill(PROMPT);
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('button', { name: '...' })).toBeDisabled();

  await page.getByRole('link', { name: 'Back to Apps' }).click();

  const generatedCard = page.locator('article').filter({ hasText: PROMPT });
  await expect(generatedCard).toBeVisible();
  await expect(generatedCard.getByText('Generating...')).toBeVisible();
  await expect(generatedCard.getByRole('button', { name: 'Delete' })).toBeDisabled();

  await expect(generatedCard.getByText('Generating...')).toBeHidden({ timeout: 20_000 });
  await expect(generatedCard.getByRole('button', { name: 'Delete' })).toBeEnabled();

  await generatedCard.getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByText('v1')).toBeVisible();
  await expect(page.getByText('Generated deterministic CI fake app.')).toBeVisible();

  await page.getByRole('link', { name: 'Back to Apps' }).click();
  await generatedCard.getByRole('link', { name: 'Run' }).click();

  const runFrame = page.frameLocator('iframe[title="preview"]');
  await expect(runFrame.getByText(FAKE_MARKER)).toBeVisible();
});
