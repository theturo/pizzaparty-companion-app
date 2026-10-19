// Richieste di account e approvazione (D-025, D-033, D-034).
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import {
  db,
  auth,
  REGIONE,
  soloAdmin,
  uidValido,
  aggiungiPermessi,
  generaCodiceInvito,
} from './comune.js';

interface InvitatoDa {
  codice: string | null;
  testo: string | null;
}

/**
 * Nuovo profilo "in attesa": prepara la richiesta per l'admin con l'email (presa da
 * Authentication) e il nome di chi ha invitato, se è arrivato da un link d'invito.
 */
export const nuovaRichiesta = onDocumentCreated(
  { document: 'utenti/{uid}', region: REGIONE },
  async (evento) => {
    const uid = evento.params.uid;
    const profilo = evento.data?.data();
    if (!profilo || profilo.stato !== 'in_attesa') return;

    const utente = await auth.getUser(uid);
    const invito = profilo.invitatoDa as InvitatoDa;
    let invitatoDaUid: string | null = null;
    let invitatoDaNome: string | null = null;
    if (invito.codice) {
      const codice = await db.doc(`inviti/${invito.codice}`).get();
      invitatoDaUid = (codice.get('proprietario') as string | undefined) ?? null;
      if (invitatoDaUid) {
        const chi = await db.doc(`profili/${invitatoDaUid}`).get();
        invitatoDaNome = (chi.get('nome') as string | undefined) ?? null;
      }
    }

    await db.doc(`richieste/${uid}`).set({
      email: utente.email ?? null,
      nome: profilo.nome,
      avatar: profilo.avatar,
      invitatoDa: {
        testo: invito.testo,
        codice: invito.codice,
        uid: invitatoDaUid,
        nome: invitatoDaNome,
        codiceValido: invito.codice ? invitatoDaUid !== null : null,
      },
      creato: FieldValue.serverTimestamp(),
    });
    // La notifica push all'admin arriva con la 1.4.
  },
);

/** L'admin approva una richiesta: permesso "approvato", profilo pubblico, link d'invito. */
export const approvaRichiesta = onCall({ region: REGIONE }, async (richiesta) => {
  const admin = soloAdmin(richiesta);
  const uid = uidValido(richiesta.data?.uid);

  const rifUtente = db.doc(`utenti/${uid}`);
  const utente = await rifUtente.get();
  if (!utente.exists || utente.get('stato') !== 'in_attesa')
    throw new HttpsError('failed-precondition', 'Questa richiesta non è più in attesa.');
  const domanda = await db.doc(`richieste/${uid}`).get();

  await aggiungiPermessi(uid, { approvato: true });
  const codice = generaCodiceInvito();
  const batch = db.batch();
  batch.update(rifUtente, {
    stato: 'approvato',
    approvatoIl: FieldValue.serverTimestamp(),
    approvatoDa: admin,
    invitatoDaUid: domanda.get('invitatoDa.uid') ?? null,
    codiceInvito: codice,
  });
  batch.set(db.doc(`profili/${uid}`), { nome: utente.get('nome'), avatar: utente.get('avatar') });
  batch.set(db.doc(`inviti/${codice}`), {
    proprietario: uid,
    creato: FieldValue.serverTimestamp(),
  });
  batch.delete(db.doc(`richieste/${uid}`));
  await batch.commit();
  return { approvato: uid };
});

/** L'admin rifiuta: account e dati si cancellano subito (D-033). */
export const rifiutaRichiesta = onCall({ region: REGIONE }, async (richiesta) => {
  soloAdmin(richiesta);
  const uid = uidValido(richiesta.data?.uid);

  const utente = await db.doc(`utenti/${uid}`).get();
  if (utente.exists && utente.get('stato') !== 'in_attesa')
    throw new HttpsError(
      'failed-precondition',
      'Si possono rifiutare solo le richieste in attesa.',
    );

  await auth.deleteUser(uid).catch((e: { code?: string }) => {
    if (e.code !== 'auth/user-not-found') throw e;
  });
  const batch = db.batch();
  batch.delete(db.doc(`utenti/${uid}`));
  batch.delete(db.doc(`richieste/${uid}`));
  await batch.commit();
  return { rifiutato: uid };
});

/** Chi è approvato cambia il proprio link d'invito (il vecchio smette di funzionare). */
export const rigeneraInvito = onCall({ region: REGIONE }, async (richiesta) => {
  if (!richiesta.auth || richiesta.auth.token.approvato !== true)
    throw new HttpsError('permission-denied', 'Solo gli account approvati hanno un invito.');
  const uid = richiesta.auth.uid;
  const rifUtente = db.doc(`utenti/${uid}`);
  const vecchio = (await rifUtente.get()).get('codiceInvito') as string | undefined;

  const codice = generaCodiceInvito();
  const batch = db.batch();
  if (vecchio) batch.delete(db.doc(`inviti/${vecchio}`));
  batch.set(db.doc(`inviti/${codice}`), {
    proprietario: uid,
    creato: FieldValue.serverTimestamp(),
  });
  batch.update(rifUtente, { codiceInvito: codice });
  await batch.commit();
  return { codice };
});

/** Nome e avatar cambiati nel profilo privato: si aggiorna la scheda pubblica. */
export const aggiornaProfiloPubblico = onDocumentUpdated(
  { document: 'utenti/{uid}', region: REGIONE },
  async (evento) => {
    const prima = evento.data?.before.data();
    const dopo = evento.data?.after.data();
    if (!prima || !dopo || dopo.stato !== 'approvato') return;
    if (prima.nome === dopo.nome && prima.avatar === dopo.avatar) return;
    await db
      .doc(`profili/${evento.params.uid}`)
      .set({ nome: dopo.nome, avatar: dopo.avatar }, { merge: true });
  },
);
