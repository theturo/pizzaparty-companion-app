// Regole di conservazione dei dati (D-035): cosa si cancella da solo e quando.
export const GIORNI_RICHIESTA = 60;
export const ANNI_INATTIVITA = 3;
/** Un account anonimo (ospite, D-065) si cancella dopo 30 giorni dalla creazione. */
export const GIORNI_ANONIMI = 30;

const GIORNO = 24 * 60 * 60 * 1000;

/** Il limite "adesso meno N anni", per le cancellazioni a scadenza. */
function laDataDiAnniFa(adesso: Date, anni: number): Date {
  const limite = new Date(adesso);
  limite.setFullYear(limite.getFullYear() - anni);
  return limite;
}

/**
 * Un account anonimo (ospite) senza email né accessi collegati, creato più di 30 giorni fa.
 * `providerData` vuoto e nessuna email: un account con password o Google non lo è mai.
 */
export function anonimoDaCancellare(
  utente: { providerData: unknown[]; email?: string; creato: Date },
  adesso: Date,
): boolean {
  if (utente.providerData.length > 0 || utente.email) return false;
  return adesso.getTime() - utente.creato.getTime() > GIORNI_ANONIMI * GIORNO;
}

/**
 * Un segnaposto di ospite (D-061, D-067) si cancella dopo 3 anni, se non è stato collegato a un account.
 * La presenza collegata si cancella insieme, nella Function di pulizia.
 */
export function segnapostoDaCancellare(
  segnaposto: { origine?: string; collegatoA?: unknown; creato: Date },
  adesso: Date,
): boolean {
  if (segnaposto.origine !== 'ospite' || segnaposto.collegatoA !== undefined) return false;
  return segnaposto.creato < laDataDiAnniFa(adesso, ANNI_INATTIVITA);
}

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
  return ultimaAttivita < laDataDiAnniFa(adesso, ANNI_INATTIVITA);
}
