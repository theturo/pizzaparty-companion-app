import { expect, test, type Browser, type Page } from '@playwright/test';
import { accedi, PASSWORD } from './aiuti';
import {
  creaEdizione,
  creaSchedaPubblica,
  creaUtenteApprovato,
  emailDiProva,
  giornoRoma,
  rendiAdmin,
} from './emulatori';

// Check-in con il link (D-058, D-059). I test girano in fila: il codice del punto (a) serve agli altri.
// Le Functions dell'emulatore usano l'ora vera (non page.clock): per il caso "aperto" l'edizione è
// di oggi e comincia a mezzanotte; per il caso "fuori finestra" è fra tre giorni.
test.describe.configure({ mode: 'serial', timeout: 120_000 });

const ATTESA = { timeout: 20_000 };
const PREFISSO_LINK = 'https://app.pizza-party.net/checkin?c=';

const suffisso = `${Date.now() % 100000}`;
const EDIZIONE_OGGI = {
  id: `checkin-oggi-${suffisso}`,
  nome: `Festa di oggi ${suffisso}`,
};
const EDIZIONE_LONTANA = {
  id: `checkin-lontana-${suffisso}`,
  nome: `Festa lontana ${suffisso}`,
};
const EMAIL_ADMIN = emailDiProva('checkin-admin');
const EMAIL_SOCIO = emailDiProva('checkin-socio');

let codiceOggi = '';

test.beforeAll(async () => {
  await rendiAdmin(await creaUtenteApprovato(EMAIL_ADMIN, PASSWORD));
  await creaSchedaPubblica(await creaUtenteApprovato(EMAIL_SOCIO, PASSWORD), 'Socio di prova');
  await creaEdizione(EDIZIONE_OGGI.id, {
    nome: EDIZIONE_OGGI.nome,
    quando: { tipo: 'data', data: giornoRoma(0), inizio: '00:00', fine: '23:59' },
    stato: 'annunciata',
  });
  await creaEdizione(EDIZIONE_LONTANA.id, {
    nome: EDIZIONE_LONTANA.nome,
    quando: { tipo: 'data', data: giornoRoma(3), inizio: '19:30', fine: '23:30' },
    stato: 'annunciata',
  });
});

/** Un admin nel pannello, con la modifica dell'edizione aperta. */
async function modificaNelPannello(browser: Browser, nome: string): Promise<Page> {
  const admin = await (await browser.newContext()).newPage();
  await accedi(admin, EMAIL_ADMIN);
  await admin.goto('/admin/edizioni');
  await admin
    .getByRole('listitem')
    .filter({ hasText: nome })
    .getByRole('button', { name: 'Modifica' })
    .click();
  return admin;
}

/** Il codice del QR com'è scritto nel pannello (il link in chiaro). */
async function codiceNelPannello(admin: Page): Promise<string> {
  const link = (await admin.locator('code').textContent()) ?? '';
  expect(link.startsWith(PREFISSO_LINK)).toBe(true);
  return link.slice(PREFISSO_LINK.length);
}

test("(a) l'admin genera il codice nel pannello e vede il link", async ({ browser }) => {
  const admin = await modificaNelPannello(browser, EDIZIONE_OGGI.nome);
  await expect(admin.getByRole('heading', { name: 'Check-in e presenze' })).toBeVisible(ATTESA);
  await admin.getByRole('button', { name: 'Genera il codice' }).click();
  await expect(admin.getByRole('button', { name: 'Scarica il QR' })).toBeVisible(ATTESA);
  codiceOggi = await codiceNelPannello(admin);
  expect(codiceOggi).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
});

test('(b) l’approvato inquadra il QR: "Sei dentro!", poi "Ci sei già!"', async ({ browser }) => {
  const socio = await (await browser.newContext()).newPage();
  await accedi(socio, EMAIL_SOCIO);
  await socio.goto(`/checkin?c=${codiceOggi}`);
  await expect(socio.getByRole('heading', { level: 1, name: 'Sei dentro!' })).toBeVisible(ATTESA);
  await expect(
    socio.getByText(/Presenza registrata alle \d{2}:\d{2}\. Buona festa!/),
  ).toBeVisible();

  await socio.reload();
  await expect(socio.getByRole('heading', { level: 1, name: 'Ci sei già!' })).toBeVisible(ATTESA);
  await expect(socio.getByText(/La tua presenza è registrata dalle \d{2}:\d{2}\./)).toBeVisible();
});

test('(c) senza accesso: "Accedi" porta al login e poi torna al check-in', async ({ browser }) => {
  const ospite = await (await browser.newContext()).newPage();
  await ospite.goto(`/checkin?c=${codiceOggi}`);
  await expect(
    ospite.getByRole('heading', { level: 1, name: 'Benvenuto al PizzaParty!' }),
  ).toBeVisible(ATTESA);
  const accediLink = ospite.getByRole('link', { name: 'Accedi', exact: true });
  await expect(accediLink).toHaveAttribute('href', /\/accedi\?ritorno=/);
  await accediLink.click();
  await expect(ospite).toHaveURL(/\/accedi\?ritorno=/);

  await ospite.getByLabel('Email').fill(EMAIL_SOCIO);
  await ospite.getByLabel('Password').fill(PASSWORD);
  await ospite.getByRole('button', { name: 'Accedi' }).click();
  await expect(ospite).toHaveURL(/\/checkin\?c=/, ATTESA);
  // Il socio ha già la presenza del punto (b): il check-in lo dice senza scriverne un'altra.
  await expect(ospite.getByRole('heading', { level: 1, name: 'Ci sei già!' })).toBeVisible(ATTESA);
});

test("(d) l'admin vede i presenti e annulla una presenza", async ({ browser }) => {
  const admin = await modificaNelPannello(browser, EDIZIONE_OGGI.nome);
  await expect(admin.getByRole('heading', { level: 3, name: 'Presenti: 1' })).toBeVisible(ATTESA);
  await expect(admin.getByText('Socio di prova')).toBeVisible();

  await admin.getByRole('button', { name: 'Annulla la presenza' }).click();
  const dialogo = admin.getByRole('dialog');
  await expect(dialogo).toContainText('Annullare la presenza di Socio di prova?');
  await dialogo.getByRole('button', { name: 'Annulla la presenza' }).click();
  await expect(admin.getByRole('heading', { level: 3, name: 'Presenti: 0' })).toBeVisible(ATTESA);
});

test('(e) fuori dalla finestra: "Check-in non riuscito" con l’orario di apertura', async ({
  browser,
}) => {
  const admin = await modificaNelPannello(browser, EDIZIONE_LONTANA.nome);
  await admin.getByRole('button', { name: 'Genera il codice' }).click();
  await expect(admin.getByRole('button', { name: 'Scarica il QR' })).toBeVisible(ATTESA);
  const codiceLontano = await codiceNelPannello(admin);

  const socio = await (await browser.newContext()).newPage();
  await accedi(socio, EMAIL_SOCIO);
  await socio.goto(`/checkin?c=${codiceLontano}`);
  await expect(socio.getByRole('heading', { level: 1, name: 'Check-in non riuscito' })).toBeVisible(
    ATTESA,
  );
  await expect(
    socio.getByRole('alert').filter({
      hasText: 'Il check-in è aperto dalle 19:00 del giorno della festa alle 03:00 della notte.',
    }),
  ).toBeVisible();
});
