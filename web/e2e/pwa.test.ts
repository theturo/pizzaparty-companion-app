import { expect, test } from '@playwright/test';

// Il service worker nei test automatici è affidabile solo su Chromium.
test.skip(({ browserName }) => browserName !== 'chromium', 'service worker verificato su Chromium');

test("l'app è installabile e si apre senza rete", async ({ page, context }) => {
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
