import { expect, test } from '@playwright/test';
import { creaAccount, emailDiProva, rendiAdmin } from './emulatori';
import { accedi, esci, registra, PASSWORD } from './aiuti';

// Notifiche (D-036). Negli emulatori Cloud Messaging non esiste: si verifica tutto il resto
// (permesso, registrazione del dispositivo, disattivazione all'uscita); l'invio vero si prova a mano.
test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'permesso notifiche automatico solo su Chromium',
);
test.describe.configure({ timeout: 90_000 });
const ATTESA_FUNCTIONS = { timeout: 20_000 };

test('invito dopo la registrazione: attivate, si vedono nei dati, uscendo si spengono', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['notifications']);
  const email = emailDiProva('avvisami');
  await registra(page, { email, nome: 'Impaziente' });

  await expect(page.getByText('Vuoi saperlo subito?')).toBeVisible();
  await page.getByRole('button', { name: 'Avvisami' }).click();
  await expect(page.getByText('Vuoi saperlo subito?')).toHaveCount(0);
  await expect(page.getByText('Attive su questo dispositivo')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Disattiva le notifiche' })).toBeVisible();

  await page.getByRole('link', { name: 'Vedi e scarica i tuoi dati' }).click();
  await expect(page.getByText('Android · Chrome')).toBeVisible(ATTESA_FUNCTIONS);

  // Uscendo, il dispositivo si toglie: rientrando non c'è più.
  await page.goto('/profilo');
  await esci(page);
  await accedi(page, email);
  await expect(page.getByRole('button', { name: 'Attiva le notifiche' })).toBeVisible();
  await page.getByRole('link', { name: 'Vedi e scarica i tuoi dati' }).click();
  await expect(page.getByText('Impaziente').first()).toBeVisible(ATTESA_FUNCTIONS);
  await expect(page.getByText('Android · Chrome')).toHaveCount(0);
});

test("l'approvazione con le notifiche attive va a buon fine", async ({
  page,
  context,
  browser,
}) => {
  await context.grantPermissions(['notifications']);
  const nome = `Avvisato ${Date.now() % 100000}`;
  await registra(page, { email: emailDiProva('avvisato'), nome });
  await page.getByRole('button', { name: 'Avvisami' }).click();
  await expect(page.getByText('Attive su questo dispositivo')).toBeVisible();

  const emailAdmin = emailDiProva('admin');
  await rendiAdmin(await creaAccount(emailAdmin, PASSWORD));
  const admin = await (await browser.newContext()).newPage();
  await accedi(admin, emailAdmin);
  await admin.goto('/admin');
  await admin
    .locator('.scheda', { hasText: nome })
    .getByRole('button', { name: 'Approva' })
    .click(ATTESA_FUNCTIONS);

  await expect(page.getByText('Approvato', { exact: true })).toBeVisible(ATTESA_FUNCTIONS);
});

test('"No, grazie" chiude l\'invito, ma l\'interruttore resta nel profilo', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['notifications']);
  await registra(page, { email: emailDiProva('riservato'), nome: 'Riservato' });
  await page.getByRole('button', { name: 'No, grazie' }).click();
  await expect(page.getByText('Vuoi saperlo subito?')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Spente su questo dispositivo.')).toBeVisible();
  await expect(page.getByText('Vuoi saperlo subito?')).toHaveCount(0);
});
