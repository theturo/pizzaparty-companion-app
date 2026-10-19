import { expect, test } from '@playwright/test';
import { creaAccount, emailDiProva, ultimoLink } from './emulatori';

test('registrazione completa con link d\'invito: link email, password, profilo "in attesa"', async ({
  page,
}) => {
  const email = emailDiProva('nuovo');

  // 1. Si arriva da un link d'invito e si chiede il link di registrazione.
  await page.goto('/registrati?invito=giulia-1234');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Mandami il link' }).click();
  await expect(page.getByRole('status').filter({ hasText: email })).toBeVisible();

  // 2. Si apre il link "ricevuto via email", passando dalla pagina d'azione come nella realtà.
  const link = await ultimoLink(email, 'EMAIL_SIGNIN');
  await page.goto(`/azione${link.search}`);
  await expect(page).toHaveURL(/\/completa/);
  await expect(page.getByText('Email verificata')).toBeVisible();
  // Con l'invito, la domanda "chi ti ha invitato?" non serve.
  await expect(page.getByLabel(/Chi ti ha invitato/)).toHaveCount(0);

  // 3. Si completa il profilo.
  await page.getByLabel(/^Password/).fill('pizza-margherita');
  await page.getByLabel('Ripeti la password').fill('pizza-margherita');
  await page.getByLabel('Come ti chiamano al PizzaParty').fill('Dino');
  await page.getByText('Forno a legna').click();
  await page.getByLabel(/almeno 18 anni/).check();
  await page.getByLabel(/informativa privacy/).check();
  await page.getByRole('button', { name: 'Invia la richiesta' }).click();
  await expect(page.getByText('Richiesta inviata!')).toBeVisible();

  // 4. Il profilo risulta in attesa di approvazione.
  await page.getByRole('link', { name: 'Vai al profilo' }).click();
  await expect(page.getByText('Dino')).toBeVisible();
  await expect(page.getByText('In attesa di approvazione')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Forno a legna' })).toBeVisible();

  // 5. Si esce e si rientra con email e password (come dall'app installata).
  await page.getByRole('button', { name: 'Esci' }).click();
  await expect(page.getByRole('link', { name: 'Accedi' })).toBeVisible();
  await page.getByRole('link', { name: 'Accedi' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('pizza-margherita');
  await page.getByRole('button', { name: 'Accedi' }).click();
  await expect(page).toHaveURL('/profilo');
  await expect(page.getByText('In attesa di approvazione')).toBeVisible();
});

test('la registrazione rifiuta password diverse e consensi mancanti', async ({ page }) => {
  const email = emailDiProva('distratto');
  await page.goto('/registrati');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Mandami il link' }).click();
  const link = await ultimoLink(email, 'EMAIL_SIGNIN');
  await page.goto(`/completa${link.search}`);

  await page.getByLabel(/^Password/).fill('pizza-margherita');
  await page.getByLabel('Ripeti la password').fill('pizza-marinara');
  await page.getByLabel('Come ti chiamano al PizzaParty').fill('Dino');
  // Senza invito si può scrivere chi ci ha invitato.
  await page.getByLabel(/Chi ti ha invitato/).fill('Arturo');
  await page.getByRole('button', { name: 'Invia la richiesta' }).click();
  await expect(page.getByRole('alert')).toHaveText('Le due password non coincidono.');

  await page.getByLabel('Ripeti la password').fill('pizza-margherita');
  await page.getByRole('button', { name: 'Invia la richiesta' }).click();
  await expect(page.getByRole('alert')).toHaveText('Per continuare servono entrambe le conferme.');
});

test('accesso: password sbagliata, poi giusta, poi registrazione da completare', async ({
  page,
}) => {
  const email = emailDiProva('esistente');
  await creaAccount(email, 'pizza-diavola');

  await page.goto('/accedi');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('pizza-sbagliata');
  await page.getByRole('button', { name: 'Accedi' }).click();
  await expect(page.getByRole('alert')).toHaveText('Email o password non corrette.');

  await page.getByLabel('Password').fill('pizza-diavola');
  await page.getByRole('button', { name: 'Accedi' }).click();
  await expect(page).toHaveURL('/profilo');
  await expect(page.getByRole('link', { name: 'Completa la registrazione' })).toBeVisible();
});

test('password dimenticata: link email, nuova password, accesso', async ({ page }) => {
  const email = emailDiProva('smemorato');
  await creaAccount(email, 'pizza-vecchia');

  await page.goto('/password-dimenticata');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Mandami il link' }).click();
  await expect(page.getByRole('status').filter({ hasText: email })).toBeVisible();

  const link = await ultimoLink(email, 'PASSWORD_RESET');
  await page.goto(`/azione${link.search}`);
  await expect(page.getByText(`Scegli una nuova password per ${email}`)).toBeVisible();
  await page.getByLabel(/^Nuova password/).fill('pizza-nuova-1');
  await page.getByLabel('Ripeti la password').fill('pizza-nuova-1');
  await page.getByRole('button', { name: 'Salva la password' }).click();
  await expect(page.getByText('Password cambiata.')).toBeVisible();

  await page.getByRole('link', { name: 'Accedi' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('pizza-nuova-1');
  await page.getByRole('button', { name: 'Accedi' }).click();
  await expect(page).toHaveURL('/profilo');
});
