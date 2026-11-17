import { expect, test } from '@playwright/test';
import { accedi, PASSWORD } from './aiuti';
import {
  creaEdizione,
  creaSchedaPubblica,
  creaUtenteApprovato,
  emailDiProva,
  giornoRoma,
  rendiAdmin,
} from './emulatori';

import { corsiaCondivisa } from './corsia';

corsiaCondivisa();

// Presenze a mano, persone senza account e collegamento (blocco 3.4, D-070, D-071, D-072).
// I test girano in fila: ognuno usa la persona e l'edizione create dal primo.
test.describe.configure({ mode: 'serial', timeout: 120_000 });

const ATTESA = { timeout: 20_000 };

const suffisso = `${Date.now() % 100000}`;
const EDIZIONE = {
  id: `presenze-storica-${suffisso}`,
  nome: `Festa storica ${suffisso}`,
  giorno: giornoRoma(-30),
};
// Il suffisso tiene distinte le persone se il test gira più volte sullo stesso emulatore.
const PERSONA = `Mario Rossi ${suffisso}`;
const NOME_ACCOUNT = `Lucia Verdi ${suffisso}`;
const EDIZIONE_DUE = {
  id: `presenze-due-${suffisso}`,
  nome: `Festa due ${suffisso}`,
  giorno: giornoRoma(-60),
};
const PERSONA_DUE = `Anna Bianchi ${suffisso}`;
const EMAIL_ADMIN = emailDiProva('presenze-admin');
const EMAIL_ACCOUNT = emailDiProva('presenze-socia');

test.beforeAll(async () => {
  await rendiAdmin(await creaUtenteApprovato(EMAIL_ADMIN, PASSWORD));
  await creaSchedaPubblica(await creaUtenteApprovato(EMAIL_ACCOUNT, PASSWORD), NOME_ACCOUNT);
  await creaEdizione(EDIZIONE.id, {
    nome: EDIZIONE.nome,
    quando: { tipo: 'data', data: EDIZIONE.giorno },
    stato: 'conclusa',
  });
  await creaEdizione(EDIZIONE_DUE.id, {
    nome: EDIZIONE_DUE.nome,
    quando: { tipo: 'data', data: EDIZIONE_DUE.giorno },
    stato: 'conclusa',
  });
});

test("(a) l'admin aggiunge una persona senza account e le dà la presenza nell'edizione", async ({
  page,
}) => {
  await accedi(page, EMAIL_ADMIN);
  await page.goto('/admin/presenze');

  const modulo = page.locator('form').filter({ has: page.getByLabel('Nome', { exact: true }) });
  await modulo.getByLabel('Nome', { exact: true }).fill(PERSONA);
  await modulo.getByRole('button', { name: 'Aggiungi', exact: true }).click();

  const elenco = page.getByRole('list', { name: 'Persone senza account' });
  const riga = elenco.getByRole('listitem').filter({ hasText: PERSONA });
  await expect(riga).toBeVisible(ATTESA);
  await riga.getByRole('button', { name: 'Aggiungi presenza' }).click();
  await riga.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await expect(page.getByText('Presenza aggiunta.')).toBeVisible(ATTESA);

  // Panoramica: una presenza, di una persona alla prima festa (quindi nuova leva).
  const panoramica = page.getByRole('row').filter({ hasText: EDIZIONE.nome });
  await expect(panoramica).toBeVisible(ATTESA);
  const celle = panoramica.getByRole('cell');
  await expect(celle.nth(0)).toHaveText('1');
  await expect(celle.nth(2)).toHaveText('1');
  await expect(celle.nth(3)).toHaveText('1');
});

test('(b) l’admin collega la persona a un account approvato', async ({ page }) => {
  await accedi(page, EMAIL_ADMIN);
  await page.goto('/admin/presenze');

  const elenco = page.getByRole('list', { name: 'Persone senza account' });
  const riga = elenco.getByRole('listitem').filter({ hasText: PERSONA });
  await expect(riga).toBeVisible(ATTESA);
  await riga.getByRole('button', { name: 'Collega a un account' }).click();
  await riga.getByLabel('Account').selectOption({ label: NOME_ACCOUNT });
  await riga.getByRole('button', { name: 'Continua' }).click();

  const conferma = page.getByRole('dialog');
  await expect(conferma).toContainText(`Collegare ${PERSONA} all'account di ${NOME_ACCOUNT}?`);
  await conferma.getByRole('button', { name: 'Collega', exact: true }).click();

  await expect(elenco.getByRole('listitem').filter({ hasText: PERSONA })).toHaveCount(0, ATTESA);
});

test('(c) con l’account, il profilo mostra la presenza alla festa', async ({ page }) => {
  await accedi(page, EMAIL_ACCOUNT);
  await expect(page.getByText('Hai partecipato a 1 PizzaParty.')).toBeVisible(ATTESA);
  await expect(page.getByText(`${EDIZIONE.nome} · ${EDIZIONE.giorno.slice(0, 4)}`)).toBeVisible(
    ATTESA,
  );
});

test('(d) annullare una presenza dal check-in lascia le altre della persona senza account', async ({
  page,
}) => {
  await accedi(page, EMAIL_ADMIN);
  await page.goto('/admin/presenze');

  // Anna ha una presenza nella prima festa (la più recente, scelta per prima) e una nella seconda.
  const modulo = page.locator('form').filter({ has: page.getByLabel('Nome', { exact: true }) });
  await modulo.getByLabel('Nome', { exact: true }).fill(PERSONA_DUE);
  await modulo.getByRole('button', { name: 'Aggiungi', exact: true }).click();

  const elenco = page.getByRole('list', { name: 'Persone senza account' });
  const riga = elenco.getByRole('listitem').filter({ hasText: PERSONA_DUE });
  await expect(riga).toBeVisible(ATTESA);
  await riga.getByRole('button', { name: 'Aggiungi presenza' }).click();
  await riga.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await expect(page.getByText('Presenza aggiunta.')).toBeVisible(ATTESA);

  await riga.getByRole('button', { name: 'Aggiungi presenza' }).click();
  await riga
    .getByLabel('Edizione')
    .selectOption({ label: `${EDIZIONE_DUE.nome} · ${EDIZIONE_DUE.giorno.slice(0, 4)}` });
  await riga.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await expect(page.getByText('Presenza aggiunta.')).toBeVisible(ATTESA);

  // Dal check-in della seconda festa si annulla solo quella presenza.
  await page.goto('/admin/edizioni');
  await page
    .getByRole('listitem')
    .filter({ hasText: EDIZIONE_DUE.nome })
    .getByRole('button', { name: 'Modifica' })
    .click();
  const presente = page.getByRole('listitem').filter({ hasText: PERSONA_DUE });
  await expect(presente).toBeVisible(ATTESA);
  await presente.getByRole('button', { name: 'Annulla la presenza' }).click();
  const conferma = page.getByRole('dialog');
  await expect(conferma).toContainText('Le altre presenze restano.');
  await conferma.getByRole('button', { name: 'Annulla la presenza' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: PERSONA_DUE })).toHaveCount(0, ATTESA);

  // La persona resta tra quelle senza account, con la presenza dell'altra festa.
  await page.goto('/admin/presenze');
  const rimasta = page
    .getByRole('list', { name: 'Persone senza account' })
    .getByRole('listitem')
    .filter({ hasText: PERSONA_DUE });
  await expect(rimasta).toBeVisible(ATTESA);
  await expect(rimasta).toContainText('1 presenza');
});
