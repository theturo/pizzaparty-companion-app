// Passaggi ricorrenti dei test, fatti dall'interfaccia come una persona.
import { expect, type Page } from '@playwright/test';
import { ultimoLink } from './emulatori';

export const PASSWORD = 'pizza-margherita';

/** Registrazione completa: email, link, password, nome, consensi. Finisce sul profilo "in attesa". */
export async function registra(
  page: Page,
  {
    email,
    nome,
    invito,
    invitatoDa,
  }: { email: string; nome: string; invito?: string; invitatoDa?: string },
) {
  await page.goto(invito ? `/registrati?invito=${invito}` : '/registrati');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Mandami il link' }).click();
  await expect(page.getByRole('status').filter({ hasText: email })).toBeVisible();

  const link = await ultimoLink(email, 'EMAIL_SIGNIN');
  await page.goto(`/azione${link.search}`);
  await page.getByLabel(/^Password/).fill(PASSWORD);
  await page.getByLabel('Ripeti la password').fill(PASSWORD);
  await page.getByLabel('Come ti chiamano al PizzaParty').fill(nome);
  if (invitatoDa) await page.getByLabel(/Chi ti ha invitato/).fill(invitatoDa);
  await page.getByLabel(/almeno 18 anni/).check();
  await page.getByLabel(/informativa privacy/).check();
  await page.getByRole('button', { name: 'Invia la richiesta' }).click();
  await expect(page.getByText('Richiesta inviata!')).toBeVisible();
  await page.getByRole('link', { name: 'Vai al profilo' }).click();
  await expect(page.getByText('In attesa di approvazione')).toBeVisible();
}

export async function accedi(page: Page, email: string, password = PASSWORD) {
  await page.goto('/accedi');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Accedi' }).click();
  await expect(page).toHaveURL('/profilo');
}

/** Esce dal profilo e aspetta che l'uscita sia finita: cambiare pagina prima la interromperebbe. */
export async function esci(page: Page) {
  await page.getByRole('button', { name: 'Esci' }).click();
  await expect(page.getByRole('link', { name: 'Accedi' })).toBeVisible();
}
