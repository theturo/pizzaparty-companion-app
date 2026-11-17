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
