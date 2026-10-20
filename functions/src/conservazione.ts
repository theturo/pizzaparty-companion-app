// Regole di conservazione dei dati (D-035): cosa si cancella da solo e quando.
export const GIORNI_RICHIESTA = 60;
export const ANNI_INATTIVITA = 3;

const GIORNO = 24 * 60 * 60 * 1000;

/** Una richiesta mai approvata scade dopo 60 giorni. */
export function richiestaScaduta(creata: Date, adesso: Date): boolean {
  return adesso.getTime() - creata.getTime() > GIORNI_RICHIESTA * GIORNO;
}

/**
 * Un account senza attività da 3 anni si cancella. Gli admin no, per non restare senza.
 * `ultimaAttivita` è l'ultimo accesso o rinnovo della sessione registrato da Authentication.
 */
export function accountInattivo(ultimaAttivita: Date, adesso: Date, admin: boolean): boolean {
  if (admin) return false;
  const limite = new Date(adesso);
  limite.setFullYear(limite.getFullYear() - ANNI_INATTIVITA);
  return ultimaAttivita < limite;
}
