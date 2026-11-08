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
  // Ogni icona del manifest è un PNG raggiungibile (niente più SVG provvisori).
  for (const icona of manifest.icons) {
    expect(icona.type).toBe('image/png');
    const risposta = await page.request.get(icona.src);
    expect(risposta.status()).toBe(200);
    expect(risposta.headers()['content-type']).toContain('image/png');
  }
  const favicon = await page.request.get('/icons/favicon-48.png');
  expect(favicon.headers()['content-type']).toContain('image/png');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    'href',
    /\/icons\/favicon-48\.png$/,
  );

  // Si aspetta che il service worker abbia messo l'app in cache.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();

  await context.setOffline(true);
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Informativa privacy');
  await page.goto('/una-pagina-mai-vista');
  // Senza accesso, la Home è la pagina d'ingresso (D-045).
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('La serata comincia qui.');
  await context.setOffline(false);
});
