import { expect, test, type Page } from '@playwright/test';
import { creaAccount, creaProfilo, emailDiProva } from './emulatori';
import { accedi, accediComeApprovato, PASSWORD, registra } from './aiuti';

// Chi non è approvato vede la pagina d'ingresso, senza barra; la barra compare solo dopo l'approvazione (D-045).
const TITOLO_OSPITE = 'La serata comincia qui.';
const SEZIONI_RISERVATE = ['/trofei', '/pizzagram', '/ordina', '/admin'];

async function nessunaBarra(page: Page) {
  await expect(page.getByRole('navigation', { name: 'Sezioni' })).toHaveCount(0);
}

test("ospite: pagina d'ingresso con accesso e registrazione, senza barra", async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITOLO_OSPITE);
  await expect(page.getByText('PizzaParty', { exact: true })).toBeVisible();
  await expect(page.getByText("L'app degli invitati del PizzaParty:")).toBeVisible();
  await expect(page.getByText('check-in, trofei, foto e ordini della serata.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Accedi' })).toHaveAttribute('href', '/accedi');
  await expect(page.getByRole('link', { name: 'Registrati' })).toHaveAttribute(
    'href',
    '/registrati',
  );
  await expect(page.getByRole('link', { name: 'Informazioni' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Privacy' })).toBeVisible();
  await nessunaBarra(page);
});

test("ospite: le sezioni riservate tornano alla pagina d'ingresso", async ({ page }) => {
  for (const percorso of SEZIONI_RISERVATE) {
    await page.goto(percorso);
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITOLO_OSPITE);
    await nessunaBarra(page);
  }
});

test('ospite: profilo e pagine legali restano aperte, senza barra', async ({ page }) => {
  await page.goto('/profilo');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Profilo');
  await page.goto('/accedi');
  await expect(page).toHaveURL('/accedi');
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Informativa privacy');
  await nessunaBarra(page);
});

test("a 320 px la pagina d'ingresso resta nello schermo senza sovrapposizioni", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  // Dall'alto in basso: titolo, testo, Accedi, Registrati, uno sotto l'altro senza toccarsi.
  const riquadri = [
    page.getByRole('heading', { level: 1 }),
    page.getByText('check-in, trofei, foto e ordini della serata.'),
    page.getByRole('link', { name: 'Accedi' }),
    page.getByRole('link', { name: 'Registrati' }),
  ];
  const misure = [];
  for (const riquadro of riquadri) {
    const box = await riquadro.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    misure.push(box!);
  }
  for (let i = 0; i < misure.length - 1; i++) {
    expect(misure[i].y + misure[i].height).toBeLessThanOrEqual(misure[i + 1].y);
  }
});

test("in attesa: pagina d'attesa, profilo raggiungibile, esci torna all'ingresso", async ({
  page,
}) => {
  const nome = 'In attesa';
  await registra(page, { email: emailDiProva('attesa'), nome });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Sei in lista d'attesa.");
  await expect(
    page.getByText('La Fondazione PizzaParty deve approvare il tuo account.'),
  ).toBeVisible();
  await expect(page.getByText("Appena fatto, otterrai l'accesso all'app.")).toBeVisible();
  await nessunaBarra(page);

  for (const percorso of SEZIONI_RISERVATE) {
    await page.goto(percorso);
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Sei in lista d'attesa.");
  }

  await page.getByRole('link', { name: 'Profilo' }).click();
  await expect(page).toHaveURL('/profilo');
  await expect(page.getByText('In attesa di approvazione')).toBeVisible();

  await page.goto('/');
  await page.getByRole('button', { name: 'Esci' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITOLO_OSPITE);
  await expect(page).toHaveURL('/');
});

test('sospeso: pagina dedicata con il link per segnalare il problema', async ({ page }) => {
  const email = emailDiProva('sospeso');
  await creaProfilo(await creaAccount(email, PASSWORD), 'sospeso', 'Sospeso');
  await accedi(page, email);

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Account sospeso.');
  await expect(page.getByText('Per informazioni scrivi agli organizzatori.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Segnala un problema' })).toHaveAttribute(
    'href',
    /^mailto:aiuto@pizza-party\.net\?/,
  );
  await expect(page.getByRole('link', { name: 'Profilo' })).toHaveAttribute('href', '/profilo');
  await expect(page.getByRole('button', { name: 'Esci' })).toBeVisible();
  await nessunaBarra(page);

  await page.goto('/ordina');
  await expect(page).toHaveURL('/');
});

test('connesso senza profilo: "Completa la registrazione" porta al profilo', async ({ page }) => {
  const email = emailDiProva('incompleto');
  await creaAccount(email, PASSWORD);
  await accedi(page, email);

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITOLO_OSPITE);
  await expect(page.getByRole('link', { name: 'Accedi' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Completa la registrazione' })).toHaveAttribute(
    'href',
    '/profilo',
  );
  await nessunaBarra(page);

  await page.getByRole('link', { name: 'Completa la registrazione' }).click();
  await expect(page).toHaveURL('/profilo');
});

test("approvato: aprendo /trofei direttamente, l'ingresso non compare mai", async ({ page }) => {
  await accediComeApprovato(page);

  // Ogni navigazione del frame principale (caricamento e reindirizzamenti, anche senza ricarica).
  const percorsi: string[] = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) percorsi.push(new URL(frame.url()).pathname);
  });

  await page.goto('/trofei');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trofei');
  expect(new URL(page.url()).pathname).toBe('/trofei');
  expect(percorsi.length).toBeGreaterThan(0);
  expect(percorsi).not.toContain('/');
  await expect(page.getByText(TITOLO_OSPITE)).toHaveCount(0);
});

test('approvato: Home con la barra, le sezioni si aprono', async ({ page }) => {
  await accediComeApprovato(page);

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Il forno si sta scaldando.');
  const barra = page.getByRole('navigation', { name: 'Sezioni' });
  await expect(barra.getByRole('link')).toHaveCount(5);

  await page.goto('/trofei');
  await expect(page).toHaveURL('/trofei');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trofei');
  await expect(barra).toBeVisible();
});
