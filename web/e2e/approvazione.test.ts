import { expect, test, type Browser } from '@playwright/test';
import { creaAccount, emailDiProva, rendiAdmin } from './emulatori';
import { accedi, registra, PASSWORD } from './aiuti';

// Le Functions emulate si "avviano a freddo" alla prima chiamata (qualche secondo, come in produzione).
const ATTESA_FUNCTIONS = { timeout: 20_000 };

// Percorsi lunghi (più persone, più passaggi): più tempo del limite standard di 30 secondi.
test.describe.configure({ timeout: 90_000 });

/** Un admin connesso nel suo browser, con il pannello delle richieste aperto. */
async function pannelloAdmin(browser: Browser) {
  const email = emailDiProva('admin');
  await rendiAdmin(await creaAccount(email, PASSWORD));
  const pagina = await (await browser.newContext()).newPage();
  await accedi(pagina, email);
  // L'admin di prova non ha un profilo completo: si va dritti al pannello.
  await pagina.goto('/admin');
  await expect(pagina.getByRole('heading', { level: 1 })).toHaveText('Richieste');
  return pagina;
}

test("l'admin approva: la persona lo vede subito e riceve il suo link d'invito", async ({
  page,
  browser,
}) => {
  const nome = `Dino ${Date.now() % 100000}`;
  const email = emailDiProva('dino');
  await registra(page, { email, nome, invitatoDa: 'Arturo' });

  const admin = await pannelloAdmin(browser);
  const scheda = admin.locator('.scheda', { hasText: nome });
  await expect(scheda).toContainText(email, ATTESA_FUNCTIONS);
  await expect(scheda).toContainText('Dice di essere invitato da: «Arturo»');
  await scheda.getByRole('button', { name: 'Approva' }).click();
  await expect(scheda).toHaveCount(0, ATTESA_FUNCTIONS);

  // Dall'altra parte, senza ricaricare: stato aggiornato e link d'invito.
  await expect(page.getByRole('img', { name: 'Account verificato' })).toBeVisible(ATTESA_FUNCTIONS);
  await expect(page.getByText('In attesa di approvazione')).toHaveCount(0);
  await expect(page.getByText("Il tuo link d'invito")).toBeVisible(ATTESA_FUNCTIONS);
  // Il link resta nascosto finché non si tocca "Mostra" (D-040).
  await expect(page.locator('.link code')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mostra' }).click();
  await expect(page.locator('.link code')).toContainText('/registrati?invito=');
  await page.getByRole('button', { name: 'Nascondi' }).click();
  await expect(page.locator('.link code')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Condividi' })).toBeVisible();
});

test("chi arriva da un link d'invito porta il nome di chi l'ha invitato; il rifiuto cancella", async ({
  page,
  browser,
}) => {
  const admin = await pannelloAdmin(browser);

  // Giulia si registra e viene approvata: ora ha un link d'invito.
  const giulia = `Giulia ${Date.now() % 100000}`;
  await registra(page, { email: emailDiProva('giulia'), nome: giulia });
  await admin
    .locator('.scheda', { hasText: giulia })
    .getByRole('button', { name: 'Approva' })
    .click(ATTESA_FUNCTIONS);
  await page.getByRole('button', { name: 'Mostra' }).click(ATTESA_FUNCTIONS);
  await expect(page.locator('.link code')).toBeVisible();
  const linkInvito = new URL((await page.locator('.link code').textContent())!.trim());
  const codice = linkInvito.searchParams.get('invito')!;

  // Il suo +1 usa il link: l'admin vede "invitato da Giulia".
  const ospite = await (await browser.newContext()).newPage();
  const nomeOspite = `Ospite ${Date.now() % 100000}`;
  const emailOspite = emailDiProva('ospite');
  await registra(ospite, { email: emailOspite, nome: nomeOspite, invito: codice });
  const scheda = admin.locator('.scheda', { hasText: nomeOspite });
  await expect(scheda).toContainText(`Invitato da ${giulia} (link d'invito)`, ATTESA_FUNCTIONS);

  // Rifiuto con conferma: la richiesta sparisce e l'account non esiste più.
  await scheda.getByRole('button', { name: 'Rifiuta' }).click();
  await scheda.getByRole('button', { name: 'Conferma: rifiuta e cancella' }).click();
  await expect(scheda).toHaveCount(0, ATTESA_FUNCTIONS);

  const dopo = await (await browser.newContext()).newPage();
  await dopo.goto('/accedi');
  await dopo.getByLabel('Email').fill(emailOspite);
  await dopo.getByLabel('Password').fill(PASSWORD);
  await dopo.getByRole('button', { name: 'Accedi' }).click();
  await expect(dopo.getByRole('alert')).toHaveText('Email o password non corrette.');
});

test('chi non è admin non vede le richieste', async ({ page }) => {
  await registra(page, { email: emailDiProva('curioso'), nome: 'Curioso' });
  await page.goto('/admin');
  await expect(page.getByText('Questa pagina è riservata agli admin.')).toBeVisible();
});
