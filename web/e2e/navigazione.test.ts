import { expect, test, type Page } from '@playwright/test';
import { accediComeApprovato } from './aiuti';

const SEZIONI = [
  { nome: 'Home', percorso: '/', titolo: 'Il forno si sta scaldando.' },
  { nome: 'Trofei', percorso: '/trofei', titolo: 'Trofei' },
  { nome: 'Pizzagram', percorso: '/pizzagram', titolo: 'Pizzagram' },
  { nome: 'Ordina', percorso: '/ordina', titolo: 'Ordina' },
  { nome: 'Profilo', percorso: '/profilo', titolo: 'Profilo' },
];

/**
 * Connessioni di Firebase interrotte da un ricaricamento della pagina: WebKit le segnala come errori
 * (in console e come errori della pagina), Chromium no. Dopo l'interruzione il canale di Firestore
 * prova la rete caricando `www.google.com/images/cleardot.gif`, che la CSP blocca (giustamente).
 * Non sono difetti dell'app, quindi si ignorano: solo questi, tutto il resto conta.
 */
const RETE_INTERROTTA = [
  /auth\/network-request-failed/,
  /Could not reach Cloud Firestore backend/,
  /Firestore\/(Listen|Write)\/channel[\s\S]*due to access control checks/,
  /www\.google\.com\/images\/cleardot\.gif[\s\S]*img-src/,
];

const daIgnorare = (testo: string) => RETE_INTERROTTA.some((r) => r.test(testo));

/** Raccoglie errori della console e violazioni della CSP durante il test. */
function sorvegliaErrori(page: Page): string[] {
  const errori: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !daIgnorare(m.text())) errori.push(m.text());
  });
  page.on('pageerror', (e) => {
    if (!daIgnorare(e.message)) errori.push(e.message);
  });
  return errori;
}

// La barra e le sezioni sono riservate agli account approvati (D-045): si prova con uno di loro.
test('la barra porta a tutte le sezioni', async ({ page }) => {
  const errori = sorvegliaErrori(page);
  await accediComeApprovato(page);
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
  await accediComeApprovato(page);
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

test('dal profilo si vedono versione e novità', async ({ page }) => {
  const { version } = await import('../../package.json', { with: { type: 'json' } }).then(
    (m) => m.default,
  );
  await page.goto('/profilo');
  await page.getByRole('link', { name: `PizzaParty v${version} · Novità e informazioni` }).click();
  await expect(page).toHaveURL('/informazioni');
  await expect(page.getByText(`Versione ${version}`)).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 3, name: new RegExp(`^${version}`) }),
  ).toBeVisible();
});

test('"Segnala un problema" prepara la mail con versione e dispositivo', async ({ page }) => {
  const { version } = await import('../../package.json', { with: { type: 'json' } }).then(
    (m) => m.default,
  );
  await page.goto('/informazioni');
  const link = page.getByRole('link', { name: 'Segnala un problema' });
  await expect(link).toHaveAttribute('href', /^mailto:aiuto@pizza-party\.net\?/);
  const url = new URL((await link.getAttribute('href')) ?? '');
  const testo = url.searchParams.get('body') ?? '';
  expect(url.searchParams.get('subject')).toBe("Problema con l'app");
  expect(testo).toContain(`Versione: ${version}`);
  expect(testo).toMatch(/Dispositivo: (Android · Chrome|iPhone · Safari) · nel browser/);
  expect(testo).toContain('Account: nessun accesso');
});
