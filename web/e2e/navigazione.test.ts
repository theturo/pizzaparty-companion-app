import { expect, test, type Page } from '@playwright/test';

const SEZIONI = [
  { nome: 'Home', percorso: '/', titolo: 'Il forno si sta scaldando.' },
  { nome: 'Trofei', percorso: '/trofei', titolo: 'Trofei' },
  { nome: 'Pizzagram', percorso: '/pizzagram', titolo: 'Pizzagram' },
  { nome: 'Ordina', percorso: '/ordina', titolo: 'Ordina' },
  { nome: 'Profilo', percorso: '/profilo', titolo: 'Profilo' },
];

/** Raccoglie errori della console e violazioni della CSP durante il test. */
function sorvegliaErrori(page: Page): string[] {
  const errori: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errori.push(m.text()));
  page.on('pageerror', (e) => errori.push(e.message));
  return errori;
}

test('la barra porta a tutte le sezioni', async ({ page }) => {
  const errori = sorvegliaErrori(page);
  await page.goto('/');
  const barra = page.getByRole('navigation', { name: 'Sezioni' });
  await expect(barra.getByRole('link')).toHaveCount(SEZIONI.length);

  for (const { nome, percorso, titolo } of SEZIONI) {
    await barra.getByRole('link', { name: nome }).click();
    await expect(page).toHaveURL(percorso);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(titolo);
    await expect(barra.getByRole('link', { name: nome })).toHaveAttribute('aria-current', 'page');
  }
  expect(errori).toEqual([]);
});

test('ogni pagina si apre direttamente, senza errori', async ({ page }) => {
  const errori = sorvegliaErrori(page);
  for (const { percorso, titolo } of SEZIONI) {
    await page.goto(percorso);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(titolo);
  }
  expect(errori).toEqual([]);
});

test('una pagina inesistente mostra la pagina di errore', async ({ page }) => {
  await page.goto('/pizza-con-ananas');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Questa pizza non è nel menu.');
  await page.getByRole('link', { name: 'Torna alla Home' }).click();
  await expect(page).toHaveURL('/');
});
