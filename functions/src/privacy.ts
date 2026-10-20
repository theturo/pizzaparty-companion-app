// Diritti della persona e pulizia periodica (D-035).
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { db, auth, REGIONE, CHIAMABILE } from './comune.js';
import { cancellaTuttoDi, raccogliDatiDi } from './dati.js';
import { richiestaScaduta, accountInattivo } from './conservazione.js';

/** Quanto può essere "vecchio" l'accesso per eliminare l'account (password appena reinserita). */
const ACCESSO_RECENTE_SECONDI = 5 * 60;

/** Diritto di accesso e portabilità: tutto ciò che l'app conserva sulla persona che chiama. */
export const esportaMieiDati = onCall(CHIAMABILE, async (richiesta) => {
  if (!richiesta.auth) throw new HttpsError('unauthenticated', 'Serve aver fatto accesso.');
  return raccogliDatiDi(richiesta.auth.uid);
});

/** Eliminazione immediata dell'account e di tutti i dati collegati (D-035). */
export const eliminaMioAccount = onCall(CHIAMABILE, async (richiesta) => {
  if (!richiesta.auth) throw new HttpsError('unauthenticated', 'Serve aver fatto accesso.');
  const accessoDa = Date.now() / 1000 - Number(richiesta.auth.token.auth_time ?? 0);
  if (accessoDa > ACCESSO_RECENTE_SECONDI)
    throw new HttpsError(
      'failed-precondition',
      'Per sicurezza, reinserisci la password e riprova.',
    );
  await cancellaTuttoDi(richiesta.auth.uid);
  return { eliminato: true };
});

/** Ogni notte: richieste scadute (60 giorni) e account inattivi (3 anni). */
export const puliziaPeriodica = onSchedule(
  { schedule: 'every day 04:00', timeZone: 'Europe/Rome', region: REGIONE },
  async () => {
    const adesso = new Date();
    let richieste = 0;
    let inattivi = 0;

    const inAttesa = await db.collection('utenti').where('stato', '==', 'in_attesa').get();
    for (const documento of inAttesa.docs) {
      const creato = documento.get('creato')?.toDate?.() as Date | undefined;
      if (creato && richiestaScaduta(creato, adesso)) {
        await cancellaTuttoDi(documento.id);
        richieste++;
      }
    }

    let pagina: string | undefined;
    do {
      const elenco = await auth.listUsers(1000, pagina);
      for (const utente of elenco.users) {
        const ultima = new Date(
          utente.metadata.lastRefreshTime ??
            utente.metadata.lastSignInTime ??
            utente.metadata.creationTime,
        );
        if (accountInattivo(ultima, adesso, utente.customClaims?.admin === true)) {
          await cancellaTuttoDi(utente.uid);
          inattivi++;
        }
      }
      pagina = elenco.pageToken;
    } while (pagina);

    logger.info('Pulizia periodica completata', { richieste, inattivi });
  },
);
