import { expect, test, type Page } from '@playwright/test';
import { accedi, PASSWORD } from './aiuti';
import {
  creaCodiceCheckinDiProva,
  creaEdizione,
  creaUtenteApprovato,
  emailDiProva,
  giornoRoma,
  leggiPresenzaDiProva,
} from './emulatori';

import { corsiaCondivisa } from './corsia';

corsiaCondivisa();

// Lo scanner del QR dentro l'app (D-064). La fotocamera e il rilevatore dei QR sono finti: il browser
// di prova non ha una fotocamera vera. Le Functions usano l'ora vera, quindi l'edizione è di oggi.
test.describe.configure({ mode: 'serial', timeout: 120_000 });

const ATTESA = { timeout: 20_000 };
const CODICE = 'scan-ner2-prov';
const suffisso = `${Date.now() % 100000}`;
const EDIZIONE = { id: `scanner-oggi-${suffisso}`, nome: `Festa dello scanner ${suffisso}` };
const EMAIL_A = emailDiProva('scanner-a');
const EMAIL_B = emailDiProva('scanner-b');
let uidA = '';

const MSG_NEGATO =
  'Serve il permesso per la fotocamera. Puoi darlo dalle impostazioni del telefono, oppure inquadra il QR con la fotocamera del telefono.';

test.beforeAll(async () => {
  uidA = await creaUtenteApprovato(EMAIL_A, PASSWORD);
  await creaUtenteApprovato(EMAIL_B, PASSWORD);
  await creaEdizione(EDIZIONE.id, {
    nome: EDIZIONE.nome,
    quando: { tipo: 'data', data: giornoRoma(0), inizio: '00:00', fine: '23:59' },
    stato: 'annunciata',
  });
  await creaCodiceCheckinDiProva(EDIZIONE.id, CODICE);
});

interface Finta {
  /** Quello che il rilevatore finto legge, uno per fotogramma. Un testo che inizia con "/" è di questa app. */
  letture?: string[];
  /** Con `ripeti` l'ultima lettura resta per sempre (un QR che resta davanti alla fotocamera). */
  ripeti?: boolean;
  /** Il permesso per la fotocamera viene negato. */
  negato?: boolean;
}

/** Sostituisce fotocamera e BarcodeDetector prima che la pagina parta. Conta le tracce aperte. */
async function simulaFotocamera(
  page: Page,
  { letture = [], ripeti = false, negato = false }: Finta,
) {
  await page.addInitScript(
    ({ letture, ripeti, negato }) => {
      const finestra = window as unknown as {
        __tracceAperte: number;
        BarcodeDetector: unknown;
      };
      finestra.__tracceAperte = 0;
      const coda = [...letture];
      const risolvi = (testo: string) => (testo.startsWith('/') ? location.origin + testo : testo);

      class RilevatoreFinto {
        async detect() {
          if (coda.length === 0) return [];
          const testo = ripeti && coda.length === 1 ? coda[0] : (coda.shift() as string);
          return [{ rawValue: risolvi(testo) }];
        }
      }
      finestra.BarcodeDetector = RilevatoreFinto;

      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        configurable: true,
        value: async () => {
          if (negato) throw new DOMException('Permesso negato', 'NotAllowedError');
          const tela = document.createElement('canvas');
          tela.width = 320;
          tela.height = 240;
          const ctx = tela.getContext('2d') as CanvasRenderingContext2D;
          const disegna = () => {
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, 320, 240);
          };
          disegna();
          setInterval(disegna, 100);
          const flusso = tela.captureStream(10);
          flusso.getTracks().forEach((traccia) => {
            finestra.__tracceAperte += 1;
            const fermaOriginale = traccia.stop.bind(traccia);
            let ferma = false;
            traccia.stop = () => {
              if (!ferma) {
                ferma = true;
                finestra.__tracceAperte -= 1;
              }
              fermaOriginale();
            };
          });
          return flusso;
        },
      });
    },
    { letture, ripeti, negato },
  );
}

const tracceAperte = (page: Page) =>
  page.evaluate(() => (window as unknown as { __tracceAperte: number }).__tracceAperte);

const scanner = (page: Page) => page.getByRole('dialog', { name: "Inquadra il QR all'ingresso" });

// Su WebKit in CI il flusso video finto (canvas.captureStream) parte tardi o non parte: i casi che
// hanno bisogno dei fotogrammi girano su Chromium, e su iPhone si provano a mano. Su WebKit resta (b).
const saltaSuWebkit = () =>
  test.skip(
    test.info().project.name.startsWith('webkit'),
    'Flusso video finto non affidabile su WebKit in CI',
  );

test('(a) l\'approvato inquadra il QR dalla Home: "Sei dentro!" e la presenza dice "scanner"', async ({
  browser,
}) => {
  saltaSuWebkit();
  const page = await (await browser.newContext()).newPage();
  await simulaFotocamera(page, { letture: [`/checkin?c=${CODICE}`] });
  await accedi(page, EMAIL_A);
  await page.goto('/');

  await page.getByRole('button', { name: 'Scansiona il QR' }).click();
  await expect(scanner(page)).toBeVisible(ATTESA);
  await expect(page.getByRole('heading', { level: 2, name: 'Sei dentro!' })).toBeVisible(ATTESA);
  await expect(scanner(page)).toBeHidden();
  expect(await tracceAperte(page)).toBe(0);

  await expect
    .poll(() => leggiPresenzaDiProva(EDIZIONE.id, uidA), ATTESA)
    .toEqual({
      via: 'scanner',
    });
});

test('(b) permesso negato: il messaggio dice come darlo, e chiudendo non resta nulla di acceso', async ({
  browser,
}) => {
  const page = await (await browser.newContext()).newPage();
  await simulaFotocamera(page, { negato: true });
  await accedi(page, EMAIL_B);
  await page.goto('/');

  await page.getByRole('button', { name: 'Scansiona il QR' }).click();
  await expect(scanner(page).getByText(MSG_NEGATO)).toBeVisible(ATTESA);
  await scanner(page).getByRole('button', { name: 'Annulla' }).click();
  await expect(scanner(page)).toBeHidden();
  expect(await tracceAperte(page)).toBe(0);
  await expect(page.getByRole('button', { name: 'Scansiona il QR' })).toBeVisible();
});

test('(c) un QR non nostro: "Questo QR non è del PizzaParty." e lo scanner continua a cercare', async ({
  browser,
}) => {
  saltaSuWebkit();
  const page = await (await browser.newContext()).newPage();
  await simulaFotocamera(page, { letture: ['https://esempio.it/menu'], ripeti: true });
  await accedi(page, EMAIL_B);
  await page.goto('/');

  await page.getByRole('button', { name: 'Scansiona il QR' }).click();
  await expect(scanner(page).getByText('Questo QR non è del PizzaParty.')).toBeVisible(ATTESA);
  await expect(scanner(page)).toBeVisible();
  expect(await tracceAperte(page)).toBeGreaterThan(0);

  await scanner(page).getByRole('button', { name: 'Annulla' }).click();
  await expect(scanner(page)).toBeHidden();
  expect(await tracceAperte(page)).toBe(0);
  await expect(page.getByRole('heading', { level: 2, name: 'Sei dentro!' })).toBeHidden();
});

test('(d) Esc chiude lo scanner e ferma la fotocamera', async ({ browser }) => {
  saltaSuWebkit();
  const page = await (await browser.newContext()).newPage();
  await simulaFotocamera(page, {});
  await accedi(page, EMAIL_B);
  await page.goto('/');

  await page.getByRole('button', { name: 'Scansiona il QR' }).click();
  await expect(scanner(page)).toBeVisible(ATTESA);
  await expect.poll(() => tracceAperte(page)).toBeGreaterThan(0);

  await page.keyboard.press('Escape');
  await expect(scanner(page)).toBeHidden();
  expect(await tracceAperte(page)).toBe(0);
});
