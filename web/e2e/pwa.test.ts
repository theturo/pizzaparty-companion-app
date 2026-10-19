import { expect, test } from '@playwright/test';

test('alla prima visita non compare il banner "nuova versione"', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Altre pagine, come farebbe chi entra la prima volta (su Safari il banner compariva qui).
  await page.goto('/profilo');
  await page.goto('/trofei');
  await page.waitForTimeout(1500);
  await expect(page.getByText('È disponibile una nuova versione')).toHaveCount(0);
});

test("l'app è installabile e si apre senza rete", async ({ page, context, browserName }) => {
  // L'uso senza rete nei test automatici è affidabile solo su Chromium.
  test.skip(browserName !== 'chromium', 'uso offline verificato su Chromium');
  await page.goto('/');
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.name).toBe('PizzaParty');
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

  // Si aspetta che il service worker abbia messo l'app in cache.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();

  await context.setOffline(true);
  await page.goto('/trofei');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trofei');
  await page.goto('/una-pagina-mai-vista');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Il forno si sta scaldando.');
  await context.setOffline(false);
});
