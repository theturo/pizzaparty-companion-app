// Chi può vedere le sezioni dell'app (D-045). Funzioni pure: lo stato arriva da fuori,
// così la regola si può provare senza Firebase.
import type { StatoAccount } from './profilo';

/** La parte dello stato di sessione che serve a decidere cosa mostrare. */
export interface StatoSessione {
  stato: 'caricamento' | 'ospite' | 'connesso';
  profilo: { stato: StatoAccount } | null;
  profiloCaricato: boolean;
  erroreProfilo: boolean;
}

/** Fasi di chi è dentro l'app o ne è fuori, con la pagina d'ingresso adatta a ciascuna. */
export type FaseIngresso = 'ospite' | 'senza_profilo' | 'in_attesa' | 'sospeso' | 'errore';
export type Fase = 'caricamento' | 'approvato' | FaseIngresso;

/** Sezioni riservate agli account approvati. `/profilo` e le pagine legali restano aperte a tutti. */
const SEZIONI_PROTETTE = ['/trofei', '/pizzagram', '/ordina', '/admin'] as const;

export function faseAccesso(s: StatoSessione): Fase {
  // Finché Firebase non ha detto chi c'è, non si sa in quale fase si è: niente reindirizzamenti.
  if (s.stato === 'caricamento') return 'caricamento';
  if (s.stato === 'ospite') return 'ospite';
  if (!s.profiloCaricato) return 'caricamento';
  // Un profilo illeggibile non è un profilo mancante: non si manda a "completa la registrazione".
  if (s.erroreProfilo) return 'errore';
  if (!s.profilo) return 'senza_profilo';
  switch (s.profilo.stato) {
    case 'approvato':
      return 'approvato';
    case 'sospeso':
      return 'sospeso';
    case 'in_attesa':
      return 'in_attesa';
  }
}

export const puoVedereSezioni = (s: StatoSessione): boolean => faseAccesso(s) === 'approvato';

/** La barra in basso compare solo per chi è approvato (D-045). */
export const mostraBarra = puoVedereSezioni;

export function percorsoProtetto(percorso: string): boolean {
  return SEZIONI_PROTETTE.some((p) => percorso === p || percorso.startsWith(`${p}/`));
}

/**
 * Cosa fare della pagina richiesta:
 * - `mostra`: si vede il suo contenuto;
 * - `attendi`: lo stato non è ancora noto, non si mostra nulla e non si reindirizza;
 * - `rimanda`: la pagina è riservata e l'account non è approvato: si torna all'ingresso.
 */
export type Decisione = 'mostra' | 'attendi' | 'rimanda';

export function decisioneSu(percorso: string, s: StatoSessione): Decisione {
  if (!percorsoProtetto(percorso)) return 'mostra';
  const fase = faseAccesso(s);
  if (fase === 'approvato') return 'mostra';
  if (fase === 'caricamento') return 'attendi';
  return 'rimanda';
}
