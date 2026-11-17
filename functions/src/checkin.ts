// Check-in con il link (blocco 3.1, D-058, D-059).
// La finestra e le decisioni sono funzioni pure, testate in checkin.test.ts. La copia in
// web/src/lib/edizioni/checkin.ts deve restare identica nella logica (i due workspace sono separati).
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, type Timestamp } from 'firebase-admin/firestore';
import { db, CHIAMABILE, soloAdmin, generaCodiceGruppi } from './comune.js';

const FUSO = 'Europe/Rome';
/** Il check-in si apre questi minuti prima dell'inizio dell'edizione. */
const MINUTI_PRIMA_DELL_INIZIO = 30;
/** Il check-in si chiude alle 03:00 del giorno dopo. */
const ORE_CHIUSURA = 27; // 24 + 3, in ore dal giorno della festa
const ORARI_PREDEFINITI = { inizio: '19:30', fine: '23:30' };
const DATA = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
const CODICE_CHECKIN = /^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/;
const ID_EDIZIONE = /^[A-Za-z0-9_-]{1,128}$/;

/** Il pezzo dell'edizione che serve al check-in (così come lo salva il pannello). */
export interface DatiPerCheckin {
  nome: string;
  stato: string;
  quando: { tipo: string; data?: string; inizio?: string; fine?: string };
}

/** Offset di Roma rispetto a UTC, in millisecondi, a un dato istante (ora legale inclusa). */
export function offsetRoma(istante: Date): number {
  const parti = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(istante);
  const v = (tipo: string) => Number(parti.find((p) => p.type === tipo)?.value);
  const comeUtc = Date.UTC(
    v('year'),
    v('month') - 1,
    v('day'),
    v('hour'),
    v('minute'),
    v('second'),
  );
  return comeUtc - (istante.getTime() - istante.getMilliseconds());
}

/**
 * Istante reale di un orario a muro di Roma. `minutiDaMezzanotte` può essere negativo
 * (il giorno prima) o superiore a 1440 (il giorno dopo).
 */
export function istanteRoma(data: string, minutiDaMezzanotte: number): Date {
  const [anno, mese, giorno] = data.split('-').map(Number);
  const aMuro = Date.UTC(anno, mese - 1, giorno, 0, minutiDaMezzanotte);
  // Due passaggi: il primo può sbagliare di un'ora vicino al cambio dell'ora.
  const primo = aMuro - offsetRoma(new Date(aMuro));
  return new Date(aMuro - offsetRoma(new Date(primo)));
}

/** Orari di inizio e fine dell'edizione; quelli mancanti valgono 19:30 e 23:30. */
export function orariDi(quando: { inizio?: string; fine?: string }): {
  inizio: string;
  fine: string;
} {
  return {
    inizio: quando.inizio ?? ORARI_PREDEFINITI.inizio,
    fine: quando.fine ?? ORARI_PREDEFINITI.fine,
  };
}

/** Apertura (inizio − 30 minuti) e chiusura (03:00 del giorno dopo), in ora di Roma. */
export function finestraCheckin(data: string, inizio: string): { apertura: Date; chiusura: Date } {
  const [ore, minuti] = inizio.split(':').map(Number);
  return {
    apertura: istanteRoma(data, ore * 60 + minuti - MINUTI_PRIMA_DELL_INIZIO),
    chiusura: istanteRoma(data, ORE_CHIUSURA * 60),
  };
}

/** "19:00": l'ora di Roma di un istante. */
export function oraRoma(istante: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(istante);
}

/** Vero se l'edizione è annunciata, con data esatta, e il check-in è aperto ad `adesso`. */
export function eAperto(edizione: DatiPerCheckin, adesso: Date): boolean {
  if (edizione.stato !== 'annunciata' || edizione.quando.tipo !== 'data') return false;
  const data = edizione.quando.data ?? '';
  if (!DATA.test(data)) return false;
  const { inizio } = orariDi(edizione.quando);
  const { apertura, chiusura } = finestraCheckin(data, inizio);
  return adesso >= apertura && adesso < chiusura;
}

/** Controlla che chi chiama abbia fatto accesso e sia approvato (o admin). Restituisce il suo uid. */
export function controllaAccesso(
  auth: { uid: string; token: Record<string, unknown> } | null | undefined,
): string {
  if (!auth) throw new HttpsError('unauthenticated', 'Accedi per registrare la presenza.');
  if (auth.token.approvato !== true && auth.token.admin !== true)
    throw new HttpsError('permission-denied', 'Il check-in è per gli account approvati.');
  return auth.uid;
}

/** Controlla l'edizione risolta dal codice: esiste, è annunciata con data, e la finestra è aperta. */
export function controllaEdizione(dati: DatiPerCheckin | undefined, adesso: Date): void {
  const valida = dati !== undefined && dati.stato === 'annunciata' && dati.quando?.tipo === 'data';
  if (!valida || !DATA.test(dati.quando.data ?? ''))
    throw new HttpsError('not-found', 'Questo QR non è valido.');
  const { inizio } = orariDi(dati.quando);
  const { apertura, chiusura } = finestraCheckin(dati.quando.data ?? '', inizio);
  if (adesso < apertura || adesso >= chiusura)
    throw new HttpsError(
      'failed-precondition',
      `Il check-in è aperto dalle ${oraRoma(apertura)} del giorno della festa alle 03:00 della notte.`,
    );
}

/**
 * Decide se scrivere la presenza: se c'è già, non si tocca e si restituisce l'ora della prima volta.
 */
export function decidiPresenza(
  esistente: { registrata?: Date } | undefined,
  adesso: Date,
): { esito: 'registrata' | 'gia-presente'; registrata: Date; scrivi: boolean } {
  if (esistente) {
    return {
      esito: 'gia-presente',
      registrata: esistente.registrata ?? adesso,
      scrivi: false,
    };
  }
  return { esito: 'registrata', registrata: adesso, scrivi: true };
}

/** Il codice del link d'ingresso: formato xxxx-xxxx-xxxx con l'alfabeto dei codici d'invito. */
export function nuovoCodiceCheckin(): string {
  return generaCodiceGruppi(3);
}

/** Solo l'admin: codice nuovo per l'edizione, il vecchio smette di funzionare. */
export const generaCodiceCheckin = onCall(CHIAMABILE, async (richiesta) => {
  soloAdmin(richiesta);
  const edizioneId = richiesta.data?.edizioneId;
  if (typeof edizioneId !== 'string' || !ID_EDIZIONE.test(edizioneId))
    throw new HttpsError('invalid-argument', 'Edizione non valida.');

  const rifEdizione = db.doc(`edizioni/${edizioneId}`);
  const rifRiservato = db.doc(`edizioni/${edizioneId}/riservato/checkin`);
  const codice = nuovoCodiceCheckin();
  await db.runTransaction(async (t) => {
    const edizione = await t.get(rifEdizione);
    if (!edizione.exists) throw new HttpsError('not-found', 'Edizione non trovata.');
    const vecchio = await t.get(rifRiservato);
    if (vecchio.exists) {
      const precedente = vecchio.get('codice') as string | undefined;
      if (precedente) t.delete(db.doc(`codiciCheckin/${precedente}`));
    }
    t.set(rifRiservato, { codice, aggiornato: FieldValue.serverTimestamp() });
    t.set(db.doc(`codiciCheckin/${codice}`), {
      edizione: edizioneId,
      creato: FieldValue.serverTimestamp(),
    });
  });
  return { codice };
});

/** Da dove è arrivata la presenza: con il link della pagina, con lo scanner dell'app (D-064) o a mano dal pannello (D-070). */
export type ViaPresenza = 'link' | 'scanner' | 'manuale';

/** Qualunque valore diverso da 'scanner' vale 'link'. */
export function viaDi(valore: unknown): ViaPresenza {
  return valore === 'scanner' ? 'scanner' : 'link';
}

/**
 * Risolve il codice del QR nell'edizione e controlla che il check-in sia aperto (per account e ospiti).
 * Il codice viene dalla chiamata, quindi si controlla qui la forma prima di leggere la mappa.
 */
async function risolviEdizione(
  codiceGrezzo: unknown,
  adesso: Date,
): Promise<{ id: string; dati: DatiPerCheckin }> {
  const codice = typeof codiceGrezzo === 'string' ? codiceGrezzo.trim().toLowerCase() : '';
  const mappa = CODICE_CHECKIN.test(codice) ? await db.doc(`codiciCheckin/${codice}`).get() : null;
  const idEdizione = mappa?.exists ? (mappa.get('edizione') as string) : null;
  const rifEdizione = idEdizione ? db.doc(`edizioni/${idEdizione}`) : null;
  const edizione = rifEdizione ? await rifEdizione.get() : null;
  if (!idEdizione || !edizione?.exists)
    throw new HttpsError('not-found', 'Questo QR non è valido.');
  const dati = edizione.data() as DatiPerCheckin;
  controllaEdizione(dati, adesso);
  return { id: idEdizione, dati };
}

/** La persona approvata inquadra il QR: si registra la presenza una sola volta. */
export const registraPresenza = onCall(CHIAMABILE, async (richiesta) => {
  const uid = controllaAccesso(richiesta.auth);
  const via = viaDi(richiesta.data?.via);
  const adesso = new Date();
  const { id: idEdizione, dati } = await risolviEdizione(richiesta.data?.codice, adesso);

  const rifPresenza = db.doc(`edizioni/${idEdizione}/presenze/${uid}`);
  const risultato = await db.runTransaction(async (t) => {
    const esistente = await t.get(rifPresenza);
    const ts = esistente.exists
      ? (esistente.get('registrata') as Timestamp | undefined)
      : undefined;
    const decisione = decidiPresenza(
      esistente.exists ? { registrata: ts?.toDate() } : undefined,
      adesso,
    );
    if (decisione.scrivi)
      t.set(rifPresenza, { uid, registrata: FieldValue.serverTimestamp(), via, tipo: 'account' });
    return decisione;
  });

  return {
    esito: risultato.esito,
    edizione: { id: idEdizione, nome: dati.nome },
    registrata: risultato.registrata.toISOString(),
  };
});

/** Chi entra come ospite: l'accesso anonimo di Firebase, senza email (D-065). */
export function controllaOspite(
  auth: { uid: string; token: { firebase?: { sign_in_provider?: string } } } | null | undefined,
): string {
  if (!auth)
    throw new HttpsError('unauthenticated', 'Entra come ospite per registrare la presenza.');
  if (auth.token.firebase?.sign_in_provider !== 'anonymous')
    throw new HttpsError('failed-precondition', 'Hai già un account: usa Accedi.');
  return auth.uid;
}

/** Il nome dell'ospite (D-067): senza spazi in più, tra 2 e 40 caratteri. */
export function nomeOspite(valore: unknown): string {
  const pulito = typeof valore === 'string' ? valore.trim().replace(/\s+/g, ' ') : '';
  if (pulito.length < 2 || pulito.length > 40)
    throw new HttpsError('invalid-argument', 'Scrivi un nome tra 2 e 40 caratteri.');
  return pulito;
}

/** Forma di confronto del nome: minuscole, senza accenti, spazi ridotti (per l'avviso del doppione). */
export function normalizzaNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Vero se un'altra presenza dell'edizione ha lo stesso nome. Solo un avviso: non blocca (D-067). */
async function nomeGiaPresente(idEdizione: string, nomeNormalizzato: string, uid: string) {
  const uguali = await db
    .collection(`edizioni/${idEdizione}/presenze`)
    .where('nomeNormalizzato', '==', nomeNormalizzato)
    .get();
  return uguali.docs.some((presenza) => presenza.id !== uid);
}

/**
 * L'ospite inquadra il QR e lascia il nome (D-060, D-065–D-068). Il segnaposto e la presenza si
 * scrivono insieme, una sola volta per dispositivo ed edizione.
 */
export const registraOspite = onCall(CHIAMABILE, async (richiesta) => {
  const uid = controllaOspite(richiesta.auth);
  const nome = nomeOspite(richiesta.data?.nome);
  const via = viaDi(richiesta.data?.via);
  const adesso = new Date();
  const { id: idEdizione, dati } = await risolviEdizione(richiesta.data?.codice, adesso);

  const nomeNorm = normalizzaNome(nome);
  const doppione = await nomeGiaPresente(idEdizione, nomeNorm, uid);

  const rifPresenza = db.doc(`edizioni/${idEdizione}/presenze/${uid}`);
  const rifSegnaposto = db.collection('segnaposto').doc();
  const risultato = await db.runTransaction(async (t) => {
    const esistente = await t.get(rifPresenza);
    const ts = esistente.exists
      ? (esistente.get('registrata') as Timestamp | undefined)
      : undefined;
    const decisione = decidiPresenza(
      esistente.exists ? { registrata: ts?.toDate() } : undefined,
      adesso,
    );
    if (decisione.scrivi) {
      t.set(rifSegnaposto, {
        nome,
        nomeNormalizzato: nomeNorm,
        creato: FieldValue.serverTimestamp(),
        origine: 'ospite',
        edizione: idEdizione,
      });
      t.set(rifPresenza, {
        uid,
        registrata: FieldValue.serverTimestamp(),
        via,
        tipo: 'ospite',
        segnaposto: rifSegnaposto.id,
        nome,
        nomeNormalizzato: nomeNorm,
      });
    }
    return decisione;
  });

  return {
    esito: risultato.esito,
    edizione: { id: idEdizione, nome: dati.nome },
    registrata: risultato.registrata.toISOString(),
    nomeGiaPresente: risultato.esito === 'registrata' && doppione,
  };
});
