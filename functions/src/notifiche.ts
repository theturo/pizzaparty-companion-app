// Invio delle notifiche push (D-030, D-036) con Firebase Cloud Messaging.
// Si mandano messaggi "solo dati": li mostra il service worker dell'app, sempre allo stesso modo.
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';
import { db, auth } from './comune.js';

export interface Notifica {
  titolo: string;
  testo: string;
  /** Pagina dell'app da aprire toccando la notifica (es. "/admin"). */
  link: string;
}

/** Errori che indicano un codice di dispositivo da buttare (app disinstallata, permesso revocato…). */
const CODICI_SCADUTI = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/** Il messaggio così come lo riceve il service worker. */
export function componiMessaggio(notifica: Notifica, tokens: string[]) {
  return {
    tokens,
    data: { titolo: notifica.titolo, testo: notifica.testo, link: notifica.link },
    webpush: { headers: { Urgency: 'high', TTL: String(24 * 60 * 60) } },
  };
}

/** Manda una notifica a tutti i dispositivi attivi di una persona; ripulisce i codici scaduti. */
export async function notificaA(uid: string, notifica: Notifica): Promise<number> {
  const dispositivi = await db.collection(`utenti/${uid}/dispositivi`).get();
  if (dispositivi.empty) return 0;
  const tokens = dispositivi.docs.map((d) => d.id);

  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    // Negli emulatori non esiste Cloud Messaging: si registra solo l'invio.
    logger.info('Notifica (simulata negli emulatori)', {
      uid,
      ...notifica,
      dispositivi: tokens.length,
    });
    return tokens.length;
  }

  const risposta = await getMessaging().sendEachForMulticast(componiMessaggio(notifica, tokens));
  const scaduti = risposta.responses
    .map((r, i) => (!r.success && CODICI_SCADUTI.has(r.error?.code ?? '') ? tokens[i] : null))
    .filter((t): t is string => t !== null);
  if (scaduti.length) {
    const batch = db.batch();
    scaduti.forEach((t) => batch.delete(db.doc(`utenti/${uid}/dispositivi/${t}`)));
    await batch.commit();
  }
  return risposta.successCount;
}

/** Notifica a tutti gli admin (letti dai permessi sul token). */
export async function notificaAgliAdmin(notifica: Notifica): Promise<void> {
  let pagina: string | undefined;
  do {
    const elenco = await auth.listUsers(1000, pagina);
    for (const utente of elenco.users) {
      if (utente.customClaims?.admin === true) await notificaA(utente.uid, notifica);
    }
    pagina = elenco.pageToken;
  } while (pagina);
}
