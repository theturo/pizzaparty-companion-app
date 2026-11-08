import { expect, test, type Browser, type Page } from '@playwright/test';
import { creaUtenteApprovato, emailDiProva, rendiAdmin } from './emulatori';
import { accedi, accediComeApprovato, PASSWORD } from './aiuti';

// Le Functions e gli emulatori possono metterci un po' alla prima chiamata.
const ATTESA = { timeout: 20_000 };

test.describe.configure({ timeout: 90_000 });

/** Un admin connesso, con il pannello delle edizioni aperto. */
async function pannelloEdizioni(browser: Browser): Promise<Page> {
  const email = emailDiProva('admin');
  await rendiAdmin(await creaUtenteApprovato(email, PASSWORD));
  const pagina = await (await browser.newContext()).newPage();
  await accedi(pagina, email);
  await pagina.goto('/admin/edizioni');
  await expect(pagina.getByRole('heading', { level: 1 })).toHaveText('Edizioni');
  return pagina;
}

test("l'admin crea un'edizione, la annuncia e la annulla", async ({ browser }) => {
  const admin = await pannelloEdizioni(browser);
  const nome = `Prova ${Date.now() % 100000}`;

  // Bozza, con il periodo scritto a parole.
  await admin.getByRole('button', { name: 'Nuova edizione' }).click();
  await admin.getByLabel('Nome', { exact: true }).fill(nome);
  await admin.getByRole('radio', { name: 'Periodo' }).check();
  await admin.getByRole('textbox', { name: 'Periodo' }).fill('Maggio 2027');
  await admin.getByRole('button', { name: 'Salva' }).click();
  await expect(admin.getByRole('status').filter({ hasText: 'Edizione salvata.' })).toBeVisible(
    ATTESA,
  );
  const voce = admin.getByRole('listitem').filter({ hasText: nome });
  await expect(voce).toContainText('Maggio 2027');
  await expect(voce).toContainText('Bozza');

  // Data esatta e stato Annunciata.
  await voce.getByRole('button', { name: 'Modifica' }).click();
  await admin.getByRole('radio', { name: 'Data esatta' }).check();
  await admin.getByLabel('Giorno', { exact: true }).fill('2027-05-22');
  await admin.getByLabel('Stato', { exact: true }).selectOption('annunciata');
  await admin.getByRole('button', { name: 'Salva' }).click();
  await expect(voce).toContainText('sabato 22 maggio 2027', ATTESA);
  await expect(voce).toContainText('Annunciata');

  // Annullamento: prima il dialog di conferma, poi lo stato Annullata.
  await voce.getByRole('button', { name: 'Modifica' }).click();
  await admin.getByRole('button', { name: "Annulla l'edizione" }).click();
  const dialogo = admin.getByRole('dialog');
  await expect(dialogo).toContainText(`Vuoi davvero annullare ${nome}?`);
  await dialogo.getByRole('button', { name: "Annulla l'edizione" }).click();
  await expect(voce).toContainText('Annullata', ATTESA);
});

test('i link di pagamento si controllano, si salvano e restano dopo un ricaricamento', async ({
  browser,
}) => {
  const admin = await pannelloEdizioni(browser);
  await admin
    .getByRole('navigation', { name: 'Sezioni del pannello' })
    .getByRole('link', {
      name: 'Gestione pagamenti',
    })
    .click();
  await expect(admin.getByRole('heading', { level: 1 })).toHaveText('Gestione pagamenti');

  const paypal = `https://pagamenti.example.test/pp-${Date.now()}`;
  await admin.getByLabel('Link PayPal').fill(paypal);
  await admin.getByLabel('Link Satispay').fill('http://pagamenti.example.test/s');
  await admin.getByRole('button', { name: 'Salva' }).click();
  await expect(admin.getByRole('alert')).toHaveText('Il link deve iniziare con https://');

  await admin.getByLabel('Link Satispay').fill('https://pagamenti.example.test/s');
  await admin.getByRole('button', { name: 'Salva' }).click();
  await expect(admin.getByRole('status').filter({ hasText: 'Link salvati.' })).toBeVisible(ATTESA);

  await admin.reload();
  await expect(admin.getByLabel('Link PayPal')).toHaveValue(paypal, ATTESA);
  await expect(admin.getByLabel('Link Satispay')).toHaveValue('https://pagamenti.example.test/s');
});

test('le schede portano alle tre pagine del pannello', async ({ browser }) => {
  const admin = await pannelloEdizioni(browser);
  const schede = admin.getByRole('navigation', { name: 'Sezioni del pannello' });
  await expect(schede.getByRole('link', { name: 'Edizioni' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await schede.getByRole('link', { name: 'Richieste' }).click();
  await expect(admin).toHaveURL('/admin');
  await expect(admin.getByRole('heading', { level: 1 })).toHaveText('Richieste');
  await expect(schede.getByRole('link', { name: 'Richieste' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await schede.getByRole('link', { name: 'Gestione pagamenti' }).click();
  await expect(admin).toHaveURL('/admin/pagamenti');
  await expect(admin.getByRole('heading', { level: 1 })).toHaveText('Gestione pagamenti');

  await schede.getByRole('link', { name: 'Edizioni' }).click();
  await expect(admin).toHaveURL('/admin/edizioni');
  await expect(admin.getByRole('heading', { level: 1 })).toHaveText('Edizioni');
});

test('chi non è admin non vede le edizioni né i pagamenti', async ({ page }) => {
  await accediComeApprovato(page, 'curiosa');
  await page.goto('/admin/edizioni');
  await expect(page.getByText('Questa pagina è riservata agli admin.')).toBeVisible();
  await page.goto('/admin/pagamenti');
  await expect(page.getByText('Questa pagina è riservata agli admin.')).toBeVisible();
});
