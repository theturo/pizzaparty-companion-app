// Versione dell'app e note di rilascio (CHANGELOG.md nella radice della repo).
import changelog from '../../../CHANGELOG.md?raw';

export const VERSIONE = __VERSIONE__;
export const COMMIT = __COMMIT__;
export const DATA_BUILD = __DATA_BUILD__;

/** Es. "0.2.0 (a1b2c3d)": da citare quando si segnala un problema. */
export const VERSIONE_COMPLETA = `${VERSIONE} (${COMMIT})`;

export interface Rilascio {
  versione: string;
  data: string;
  novita: string[];
}

/** Legge le sezioni "## x.y.z — AAAA-MM-GG" del CHANGELOG con i loro punti elenco. */
export function leggiChangelog(testo: string = changelog): Rilascio[] {
  return testo
    .split(/^## /m)
    .slice(1)
    .map((blocco) => {
      const [intestazione, ...righe] = blocco.split('\n');
      const [versione, data] = intestazione.split(' — ').map((s) => s.trim());
      const novita = righe.filter((r) => r.startsWith('- ')).map((r) => r.slice(2).trim());
      return { versione, data, novita };
    });
}
