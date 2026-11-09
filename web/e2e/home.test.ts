import { expect, test, type Page } from '@playwright/test';
import { accediComeApprovato } from './aiuti';
import { creaEdizione, svuotaEdizioni } from './emulatori';

// L'elenco delle edizioni è uno solo per tutti i test: ogni test parte da zero e lascia zero.
// Per questo i test di questo file girano in fila (serial).
test.describe.configure({ mode: 'serial' });

const TITOLO_VUOTO = 'Il forno si sta scaldando.';

// Connessioni di Firebase interrotte da un ricaricamento: si ignorano, come nella navigazione.
const RETE_INTERROTTA = [
  /auth\/network-request-failed/,
  /Could not reach Cloud Firestore backend/,
  /Firestore\/(Listen|Write)\/channel[\s\S]*due to access control checks/,
  /www\.google\.com\/images\/cleardot\.gif[\s\S]*img-src/,
  // Con l'orologio del browser fermato da page.clock, Firestore avvisa che l'ora del server
  // è «nel futuro»: è l'effetto del finto orologio, non un errore dell'app.
  /Detected an update time that is in the future/,
];

/** Raccoglie gli errori della console e della pagina, salvo le interruzioni di rete. */
function sorvegliaErrori(page: Page): string[] {
  const errori: string[] = [];
  const daIgnorare = (testo: string) => RETE_INTERROTTA.some((r) => r.test(testo));
  page.on('console', (m) => {
    if (m.type() === 'error' && !daIgnorare(m.text())) errori.push(m.text());
  });
  page.on('pageerror', (e) => {
    if (!daIgnorare(e.message)) errori.push(e.message);
  });
  return errori;
}

/** Un account approvato sulla Home, con l'orologio del browser fissato al momento dato. */
async function homeApprovata(page: Page, orologio?: Date): Promise<void> {
  await accediComeApprovato(page);
  if (orologio) await page.clock.setFixedTime(orologio);
  await page.goto('/');
}

test.beforeEach(async () => {
  await svuotaEdizioni();
});

test.afterEach(async () => {
  await svuotaEdizioni();
});

test('nessuna edizione: la Home è quella di sempre', async ({ page }) => {
  const errori = sorvegliaErrori(page);
  await homeApprovata(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITOLO_VUOTO);
  await expect(page.getByText('Prossima edizione', { exact: true })).toHaveCount(0);
  expect(errori).toEqual([]);
});

test('una bozza soltanto non si vede: la Home resta quella di sempre', async ({ page }) => {
  await creaEdizione('bozza-prova', {
    nome: 'Bozza segreta',
    quando: { tipo: 'periodo', periodo: 'Maggio 2027' },
    stato: 'bozza',
  });
  await homeApprovata(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITOLO_VUOTO);
  await expect(page.getByText('Bozza segreta')).toHaveCount(0);
});

test('annunciata con il periodo: nome, periodo e "data in arrivo", senza countdown', async ({
  page,
}) => {
  const errori = sorvegliaErrori(page);
  await creaEdizione('periodo-prova', {
    nome: 'Primavera 2027',
    quando: { tipo: 'periodo', periodo: 'Maggio 2027' },
    stato: 'annunciata',
  });
  await homeApprovata(page);
  await expect(page.getByText('Prossima edizione', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Primavera 2027');
  await expect(page.getByText('Maggio 2027', { exact: true })).toBeVisible();
  await expect(page.getByText('data in arrivo')).toBeVisible();
  await expect(page.getByRole('group')).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Il dinosauro del PizzaParty' })).toBeVisible();
  expect(errori).toEqual([]);
});

test('annunciata con la data: giorno della settimana e countdown a un giorno', async ({ page }) => {
  const errori = sorvegliaErrori(page);
  await creaEdizione('data-prova', {
    nome: 'Primavera 2027',
    quando: { tipo: 'data', data: '2027-05-22' },
    stato: 'annunciata',
  });
  // Il 20 maggio alle 12:00: restano un giorno e dodici ore.
  await homeApprovata(page, new Date(2027, 4, 20, 12, 0, 0));
  await expect(page.getByText('Sabato 22 maggio 2027')).toBeVisible();
  const conto = page.getByRole('group', { name: 'Manca 1 giorno, 12 ore e 0 minuti' });
  await expect(conto).toBeVisible();
  await expect(conto.getByText('giorno', { exact: true })).toBeVisible();
  await expect(conto.getByText('ore', { exact: true })).toBeVisible();
  await expect(conto.getByText('minuti', { exact: true })).toBeVisible();
  // Le caselle non si leggono una per una: lo dice già l'etichetta del gruppo.
  await expect(conto.locator('[aria-hidden="true"]')).toHaveCount(3);
  expect(errori).toEqual([]);
});

test('il giorno stesso: "Ci siamo: è oggi!" al posto del countdown', async ({ page }) => {
  await creaEdizione('oggi-prova', {
    nome: 'Primavera 2027',
    quando: { tipo: 'data', data: '2027-05-22' },
    stato: 'annunciata',
  });
  await homeApprovata(page, new Date(2027, 4, 22, 8, 0, 0));
  await expect(page.getByText('Ci siamo: è oggi!')).toBeVisible();
  await expect(page.getByRole('group')).toHaveCount(0);
});

test('il tema dell’edizione si applica alla Home', async ({ page }) => {
  await creaEdizione('tema-prova', {
    nome: 'Odissea',
    quando: { tipo: 'periodo', periodo: 'Autunno 2027' },
    stato: 'annunciata',
    tema: 'prova-odissea',
  });
  await homeApprovata(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Odissea');
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'prova-odissea');
});

test('annullata: il badge, le scuse della Fondazione e niente pellicola', async ({ page }) => {
  const errori = sorvegliaErrori(page);
  await creaEdizione('annullata-prova', {
    nome: 'Primavera 2027',
    quando: { tipo: 'data', data: '2027-05-22' },
    stato: 'annullata',
  });
  await homeApprovata(page);
  await expect(page.getByText('Annullata', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Primavera 2027');
  await expect(page.getByText('Questa edizione è annullata.')).toBeVisible();
  await expect(
    page.getByText('La Fondazione PizzaParty si scusa: ci rifaremo presto.'),
  ).toBeVisible();
  await expect(page.getByRole('group')).toHaveCount(0);
  await expect(page.locator('.pellicola')).toHaveCount(0);
  expect(errori).toEqual([]);
});

test('a 375 px le tre caselle del countdown stanno sulla stessa riga', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await creaEdizione('riga-prova', {
    nome: 'Primavera 2027',
    quando: { tipo: 'data', data: '2027-05-22' },
    stato: 'annunciata',
  });
  await homeApprovata(page, new Date(2027, 4, 20, 12, 0, 0));
  const caselle = page.getByRole('group').locator('.casella');
  await expect(caselle).toHaveCount(3);
  const riquadri = await caselle.evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
  const [primo, ...altri] = riquadri;
  for (const r of altri) expect(Math.round(r.top)).toBe(Math.round(primo.top));
  // Nessuno scorrimento orizzontale della pagina.
  const largezza = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(largezza).toBeLessThanOrEqual(375);
});
