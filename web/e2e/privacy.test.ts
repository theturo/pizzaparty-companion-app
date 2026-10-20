import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { emailDiProva } from './emulatori';
import { accedi, registra, PASSWORD } from './aiuti';

// Esportazione ed eliminazione passano dalle Functions emulate ("a freddo" la prima volta).
const ATTESA_FUNCTIONS = { timeout: 20_000 };
test.describe.configure({ timeout: 90_000 });

test('modifica di nome e avatar dal profilo', async ({ page }) => {
  await registra(page, { email: emailDiProva('cambio'), nome: 'Nome Vecchio' });
  await page.getByRole('button', { name: 'Modifica' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Nome Nuovo');
  await page.getByText('Birra').click();
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page.getByText('Nome Nuovo')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Birra' })).toBeVisible();
});

test('cambio password: con quella nuova si rientra', async ({ page }) => {
  const email = emailDiProva('password');
  await registra(page, { email, nome: 'Sicuro' });
  await page.getByRole('button', { name: 'Cambia password' }).click();
  await page.getByLabel('Password attuale').fill(PASSWORD);
  await page.getByLabel(/^Nuova password/).fill('pizza-capricciosa');
  await page.getByLabel('Ripeti la nuova password').fill('pizza-capricciosa');
  await page.getByRole('button', { name: 'Cambia password' }).click();
  await expect(page.getByText('Password cambiata.')).toBeVisible();

  await page.getByRole('button', { name: 'Chiudi' }).click();
  await page.getByRole('button', { name: 'Esci' }).click();
  await accedi(page, email, 'pizza-capricciosa');
});

test('i tuoi dati: pagina leggibile e file JSON completo', async ({ page }) => {
  const email = emailDiProva('curioso');
  await registra(page, { email, nome: 'Trasparente', invitatoDa: 'Arturo' });
  await page.getByRole('link', { name: 'Vedi e scarica i tuoi dati' }).click();
  await expect(page.getByText(email).first()).toBeVisible(ATTESA_FUNCTIONS);
  await expect(page.getByText('Trasparente').first()).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Scarica i tuoi dati (JSON)' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^pizzaparty-i-miei-dati-\d{4}-\d{2}-\d{2}\.json$/);
  const dati = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(dati.account.email).toBe(email);
  expect(dati.profilo.nome).toBe('Trasparente');
  expect(dati.profilo.accettazioni.maggiorenne).toBe(true);
  expect(dati.profilo.invitatoDa.testo).toBe('Arturo');
});

test("eliminazione dell'account: serve la password, poi non resta nulla", async ({ page }) => {
  const email = emailDiProva('addio');
  await registra(page, { email, nome: 'Di Passaggio' });
  await page.getByRole('link', { name: "Elimina l'account" }).click();

  await page.getByLabel('Per sicurezza, reinserisci la password').fill('password-sbagliata');
  await page.getByLabel(/non si può annullare/).check();
  await page.getByRole('button', { name: "Elimina definitivamente l'account" }).click();
  await expect(page.getByRole('alert')).toHaveText('Email o password non corrette.');

  await page.getByLabel('Per sicurezza, reinserisci la password').fill(PASSWORD);
  await page.getByRole('button', { name: "Elimina definitivamente l'account" }).click();
  await expect(page.getByText('Account eliminato.')).toBeVisible(ATTESA_FUNCTIONS);

  await page.goto('/accedi');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Accedi' }).click();
  await expect(page.getByRole('alert')).toHaveText('Email o password non corrette.');
});

test('informativa e condizioni sono complete e collegate', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Informativa privacy');
  for (const sezione of [
    'Chi tratta i tuoi dati',
    'Quali dati usiamo',
    'Perché li usiamo',
    'Fornitori e dove stanno i dati',
    'Per quanto tempo',
    'I tuoi diritti',
  ]) {
    await expect(page.getByRole('heading', { level: 2, name: sezione })).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'privacy@pizza-party.net' }).first()).toBeVisible();
  await page.goto('/condizioni');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Condizioni d'uso");
  await page.getByRole('link', { name: 'informativa privacy' }).click();
  await expect(page).toHaveURL('/privacy');
});
