// Segnaposto e presenze gestite dal pannello (blocco 3.4, D-070, D-071).
// Tutte le Functions di questo file sono riservate all'admin. La logica che decide cosa
// scrivere (scelta della persona, piano di collegamento) è pura e testata in presenze.test.ts.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, type Timestamp } from 'firebase-admin/firestore';
import { db, CHIAMABILE, soloAdmin, uidValido } from './comune.js';
import { nomeOspite, normalizzaNome, type DatiPerCheckin } from './checkin.js';

const ID_DOCUMENTO = /^[A-Za-z0-9_-]{1,128}$/;
/** Le edizioni a cui il pannello può aggiungere presenze: con data esatta e già annunciate o concluse. */
const STATI_CON_PRESENZE = ['annunciata', 'conclusa'];

/** Chi riceve la presenza: un account approvato oppure un segnaposto (persona senza account). */
export type Persona = { uid: string } | { segnaposto: string };

/** Controlla che sia passato uno solo tra `uid` e `segnaposto` (D-070). */
export function sceltaPersona(dati: { uid?: unknown; segnaposto?: unknown }): Persona {
  const haUid = dati.uid !== undefined && dati.uid !== null;
  const haSegnaposto = dati.segnaposto !== undefined && dati.segnaposto !== null;
  if (haUid === haSegnaposto)
    throw new HttpsError('invalid-argument', 'Scegli una sola persona: con account o senza.');
  if (haUid) return { uid: uidValido(dati.uid) };
  if (typeof dati.segnaposto !== 'string' || !ID_DOCUMENTO.test(dati.segnaposto))
    throw new HttpsError('invalid-argument', 'Persona non valida.');
  return { segnaposto: dati.segnaposto };
}

/** Controlla l'id di un documento passato dal pannello (edizione, segnaposto). */
function idValido(valore: unknown, messaggio: string): string {
  if (typeof valore !== 'string' || !ID_DOCUMENTO.test(valore))
    throw new HttpsError('invalid-argument', messaggio);
  return valore;
}

/** Un'edizione accetta presenze a mano se ha una data esatta e non è bozza o annullata. */
export function accettaPresenze(dati: DatiPerCheckin | undefined): void {
  if (!dati) throw new HttpsError('not-found', 'Edizione non trovata.');
  if (dati.quando?.tipo !== 'data' || !STATI_CON_PRESENZE.includes(dati.stato))
    throw new HttpsError(
      'failed-precondition',
      'Le presenze si aggiungono solo alle edizioni con data, annunciate o concluse.',
    );
}

/**
 * Una presenza del segnaposto, com'è nel database: l'edizione e i dati da conservare.
 * `istante` (millisecondi) serve a scegliere la più vecchia se ce ne sono più d'una nella stessa edizione.
 */
export interface PresenzaDaSpostare<T> {
  edizione: string;
  registrata: T;
  istante: number;
  via: string;
}

/**
 * Cosa fare al collegamento (D-071). Per ogni edizione si tiene solo la presenza più vecchia del
 * segnaposto (`duplicate` sono le altre, da cancellare senza contarle). Quella si sposta all'account,
 * tranne nelle edizioni dove l'account è già presente: lì si tiene la sua e questa si scarta (`giaPresenti`).
 */
export function pianoCollegamento<T>(
  presenze: PresenzaDaSpostare<T>[],
  edizioniDelAccount: ReadonlySet<string>,
): {
  spostare: PresenzaDaSpostare<T>[];
  giaPresenti: PresenzaDaSpostare<T>[];
  duplicate: PresenzaDaSpostare<T>[];
} {
  const ordinate = [...presenze].sort((a, b) => a.istante - b.istante);
  const viste = new Set<string>();
  const prime: PresenzaDaSpostare<T>[] = [];
  const duplicate: PresenzaDaSpostare<T>[] = [];
  for (const p of ordinate) {
    if (viste.has(p.edizione)) duplicate.push(p);
    else {
      viste.add(p.edizione);
      prime.push(p);
    }
  }
  return {
    spostare: prime.filter((p) => !edizioniDelAccount.has(p.edizione)),
    giaPresenti: prime.filter((p) => edizioniDelAccount.has(p.edizione)),
    duplicate,
  };
}

/** Il segnaposto della persona, con il nome ricontrollato come al check-in. */
function nomeSegnaposto(valore: unknown) {
  const nome = nomeOspite(valore);
  return { nome, nomeNormalizzato: normalizzaNome(nome) };
}

/** Crea una persona senza account (D-070): origine `storico`, nessuna edizione. */
export const creaSegnaposto = onCall(CHIAMABILE, async (richiesta) => {
  soloAdmin(richiesta);
  const dati = nomeSegnaposto(richiesta.data?.nome);
  const rif = db.collection('segnaposto').doc();
  await rif.set({
    ...dati,
    creato: FieldValue.serverTimestamp(),
    origine: 'storico',
  });
  return { id: rif.id };
});

/** Presenze di un segnaposto in tutte le edizioni (collection group, indice su `segnaposto`). */
function presenzeDelSegnaposto(id: string) {
  return db.collectionGroup('presenze').where('segnaposto', '==', id);
}

/** Cambia il nome del segnaposto e di tutte le sue presenze (D-070). */
export const rinominaSegnaposto = onCall(CHIAMABILE, async (richiesta) => {
  soloAdmin(richiesta);
  const id = idValido(richiesta.data?.id, 'Persona non valida.');
  const dati = nomeSegnaposto(richiesta.data?.nome);
  const rif = db.doc(`segnaposto/${id}`);
  if (!(await rif.get()).exists) throw new HttpsError('not-found', 'Persona non trovata.');

  const presenze = await presenzeDelSegnaposto(id).get();
  const batch = db.batch();
  batch.update(rif, dati);
  presenze.forEach((p) => batch.update(p.ref, dati));
  await batch.commit();
  return { ok: true };
});

/** Cancella il segnaposto e tutte le sue presenze (D-070). Non si annulla. */
export const cancellaSegnaposto = onCall(CHIAMABILE, async (richiesta) => {
  soloAdmin(richiesta);
  const id = idValido(richiesta.data?.id, 'Persona non valida.');
  const rif = db.doc(`segnaposto/${id}`);
  if (!(await rif.get()).exists) throw new HttpsError('not-found', 'Persona non trovata.');

  const presenze = await presenzeDelSegnaposto(id).get();
  const batch = db.batch();
  presenze.forEach((p) => batch.delete(p.ref));
  batch.delete(rif);
  await batch.commit();
  return { ok: true };
});

/**
 * Aggiunge a mano una presenza, con account o per un segnaposto, in un'edizione con data (D-070).
 * La finestra oraria non si applica: il pannello può correggere le presenze anche a posteriori.
 */
export const aggiungiPresenza = onCall(CHIAMABILE, async (richiesta) => {
  soloAdmin(richiesta);
  const edizioneId = idValido(richiesta.data?.edizione, 'Edizione non valida.');
  const persona = sceltaPersona(richiesta.data ?? {});

  const rifEdizione = db.doc(`edizioni/${edizioneId}`);

  if ('uid' in persona) {
    const rifAccount = db.doc(`utenti/${persona.uid}`);
    const rifPresenza = db.doc(`edizioni/${edizioneId}/presenze/${persona.uid}`);
    const esito = await db.runTransaction(async (t) => {
      const edizione = await t.get(rifEdizione);
      accettaPresenze(edizione.data() as DatiPerCheckin | undefined);
      const account = await t.get(rifAccount);
      if (!account.exists) throw new HttpsError('not-found', 'Persona non trovata.');
      const esistente = await t.get(rifPresenza);
      if (esistente.exists) return 'gia-presente' as const;
      t.set(rifPresenza, {
        uid: persona.uid,
        registrata: FieldValue.serverTimestamp(),
        via: 'manuale',
        tipo: 'account',
      });
      return 'registrata' as const;
    });
    return { esito };
  }

  const rifSegnaposto = db.doc(`segnaposto/${persona.segnaposto}`);
  const rifPresenza = db.doc(`edizioni/${edizioneId}/presenze/${persona.segnaposto}`);
  const esito = await db.runTransaction(async (t) => {
    const edizione = await t.get(rifEdizione);
    accettaPresenze(edizione.data() as DatiPerCheckin | undefined);
    const segnaposto = await t.get(rifSegnaposto);
    if (!segnaposto.exists) throw new HttpsError('not-found', 'Persona non trovata.');
    const giaInEdizione = await t.get(
      db
        .collection(`edizioni/${edizioneId}/presenze`)
        .where('segnaposto', '==', persona.segnaposto),
    );
    if (!giaInEdizione.empty) return 'gia-presente' as const;
    t.set(rifPresenza, {
      uid: null,
      registrata: FieldValue.serverTimestamp(),
      via: 'manuale',
      tipo: 'ospite',
      segnaposto: persona.segnaposto,
      nome: segnaposto.get('nome'),
      nomeNormalizzato: segnaposto.get('nomeNormalizzato'),
    });
    return 'registrata' as const;
  });
  return { esito };
});

/**
 * Collega un segnaposto a un account approvato (D-071): tutto in una transazione, letture prima
 * delle scritture. Le presenze passano all'account con data, ora e modalità originali; poi si
 * cancellano il segnaposto e le sue presenze. Non si annulla: la conferma è nel pannello.
 */
export const collegaSegnaposto = onCall(CHIAMABILE, async (richiesta) => {
  soloAdmin(richiesta);
  const segnaposto = idValido(richiesta.data?.segnaposto, 'Persona non valida.');
  const uid = uidValido(richiesta.data?.uid);
  const rifSegnaposto = db.doc(`segnaposto/${segnaposto}`);
  const rifAccount = db.doc(`utenti/${uid}`);

  return db.runTransaction(async (t) => {
    // Letture: segnaposto, sue presenze, account, e la presenza dell'account in ogni edizione coinvolta.
    const seg = await t.get(rifSegnaposto);
    if (!seg.exists) throw new HttpsError('not-found', 'Persona non trovata.');
    const presenze = await t.get(presenzeDelSegnaposto(segnaposto));
    const account = await t.get(rifAccount);
    if (!account.exists) throw new HttpsError('not-found', 'Account non trovato.');

    const daSpostare = presenze.docs.map((p) => ({
      edizione: p.ref.parent.parent?.id ?? '',
      registrata: p.get('registrata') as unknown,
      istante: (p.get('registrata') as Timestamp | undefined)?.toMillis() ?? 0,
      via: (p.get('via') as string | undefined) ?? 'link',
      ref: p.ref,
    }));
    const presenzeAccount = await Promise.all(
      daSpostare.map((p) => t.get(db.doc(`edizioni/${p.edizione}/presenze/${uid}`))),
    );
    const giaDelAccount = new Set(
      daSpostare.filter((_, i) => presenzeAccount[i].exists).map((p) => p.edizione),
    );

    const piano = pianoCollegamento(daSpostare, giaDelAccount);

    // Scritture.
    for (const p of piano.spostare)
      t.set(db.doc(`edizioni/${p.edizione}/presenze/${uid}`), {
        uid,
        registrata: p.registrata,
        via: p.via,
        tipo: 'account',
      });
    for (const p of daSpostare) t.delete(p.ref);
    t.delete(rifSegnaposto);

    return { spostate: piano.spostare.length, giaPresenti: piano.giaPresenti.length };
  });
});
