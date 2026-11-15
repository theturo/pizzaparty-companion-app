// Le edizioni sono un solo elenco nell'emulatore, e la Home mostra la più recente.
// I file girano in parallelo (più worker, due progetti), quindi quelli che creano edizioni o
// caricano la Home passano uno alla volta da questo lucchetto: così nessun test vede o cancella
// le edizioni di un altro. Il lucchetto è una cartella nel sistema temporaneo; si tiene per tutto il file.
// Chi lo prende trova zero edizioni e, prima di liberarlo, le toglie di nuovo: nessun file eredita
// le edizioni lasciate da quello precedente.
import { mkdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from '@playwright/test';
import { svuotaEdizioni } from './emulatori';

const LUCCHETTO = join(tmpdir(), 'pizzaparty-e2e-edizioni.lock');
const ATTESA_MS = 200;
/** Un lucchetto più vecchio di così è rimasto da una corsa interrotta. */
const SCADUTO_MS = 10 * 60_000;

let tenuto = false;

async function prendi(): Promise<void> {
  for (;;) {
    try {
      await mkdir(LUCCHETTO);
      tenuto = true;
      return;
    } catch (errore) {
      if ((errore as NodeJS.ErrnoException).code !== 'EEXIST') throw errore;
      const eta =
        Date.now() -
        (await stat(LUCCHETTO).then(
          (s) => s.mtimeMs,
          () => Date.now(),
        ));
      if (eta > SCADUTO_MS) await rm(LUCCHETTO, { recursive: true, force: true });
      await new Promise((risolvi) => setTimeout(risolvi, ATTESA_MS));
    }
  }
}

/** Da chiamare una volta, al livello del file di test: il file tiene il lucchetto per tutti i suoi test. */
export function corsiaCondivisa(): void {
  test.beforeAll(async () => {
    // L'attesa del lucchetto può essere lunga: il tempo del gancio si alza solo per questo.
    test.setTimeout(15 * 60_000);
    await prendi();
    await svuotaEdizioni();
  });
  test.afterAll(async () => {
    // Si libera solo il lucchetto che questo worker ha preso davvero.
    if (!tenuto) return;
    try {
      await svuotaEdizioni();
    } finally {
      await rm(LUCCHETTO, { recursive: true, force: true });
      tenuto = false;
    }
  });
}
