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
      const request = indexedDB.deleteDatabase('buildonphone');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });
}

test('smoke generation works without Anthropic key', async ({ page }) => {
  await clearClientStorage(page);

  await page.goto('/create');
  await page.getByRole('textbox').fill(PROMPT);
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.frameLocator('iframe[title="preview"]').getByText(FAKE_MARKER)).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Back' }).click();

  const generatedCard = page.locator('ion-card').filter({ hasText: PROMPT });
  await expect(generatedCard).toBeVisible({ timeout: 30_000 });
  await generatedCard.getByRole('button', { name: 'Run' }).click();

  const runFrame = page.frameLocator('iframe[title="preview"]');
  await expect(runFrame.getByText(FAKE_MARKER)).toBeVisible();
});
