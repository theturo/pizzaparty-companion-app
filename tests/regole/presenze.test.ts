import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collectionGroup,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  doc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { creaAmbiente } from './ambiente';

// Lettura delle presenze di tutte le edizioni con il collection group (D-072): profilo e pannello.
let ambiente: RulesTestEnvironment;
const ORA = Timestamp.fromDate(new Date('2026-12-19T18:00:00Z'));

beforeAll(async () => {
  ambiente = await creaAmbiente();
});
beforeEach(async () => {
  await ambiente.clearFirestore();
  await ambiente.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [id, nome] of [
      ['festa', 'Festa'],
      ['altra', 'Altra festa'],
    ] as const) {
      await setDoc(doc(db, `edizioni/${id}`), {
        nome,
        quando: { tipo: 'data', data: '2026-12-19' },
        tema: 'pizzaparty-2026',
        quota: { singolo: 5, conAccompagnatore: 10 },
        pagamenti: { paypal: true, satispay: true, contanti: true },
        stato: 'conclusa',
        creato: ORA,
        aggiornato: ORA,
      });
    }
    await setDoc(doc(db, 'edizioni/festa/presenze/giulia'), {
      uid: 'giulia',
      registrata: ORA,
      via: 'link',
    });
    await setDoc(doc(db, 'edizioni/altra/presenze/giulia'), {
      uid: 'giulia',
      registrata: ORA,
      via: 'link',
    });
    await setDoc(doc(db, 'edizioni/festa/presenze/dino'), {
      uid: 'dino',
      registrata: ORA,
      via: 'link',
    });
    // Persona senza account: nessun uid, solo il segnaposto.
    await setDoc(doc(db, 'edizioni/festa/presenze/seg1'), {
      uid: null,
      registrata: ORA,
      via: 'manuale',
      tipo: 'ospite',
      segnaposto: 'seg1',
      nome: 'Mario Rossi',
      nomeNormalizzato: 'mario rossi',
      registrataDa: serverTimestamp(),
    });
  });
});
afterAll(async () => {
  await ambiente.cleanup();
});

const admin = () =>
  ambiente.authenticatedContext('arturo', { email_verified: true, admin: true }).firestore();
const approvata = () =>
  ambiente.authenticatedContext('giulia', { email_verified: true, approvato: true }).firestore();
const altroApprovato = () =>
  ambiente.authenticatedContext('marco', { email_verified: true, approvato: true }).firestore();
const anonimo = () => ambiente.unauthenticatedContext().firestore();
const ospite = () =>
  ambiente
    .authenticatedContext('ospite1', { firebase: { sign_in_provider: 'anonymous' } })
    .firestore();

const tutte = (db: ReturnType<typeof admin>) => getDocs(collectionGroup(db, 'presenze'));
const propria = (db: ReturnType<typeof admin>, uid: string) =>
  getDocs(query(collectionGroup(db, 'presenze'), where('uid', '==', uid)));

describe('presenze di tutte le edizioni: collection group', () => {
  it("l'admin legge tutte le presenze, anche quelle senza account", async () => {
    const risultato = await assertSucceeds(tutte(admin()));
    if (risultato.size !== 4) throw new Error(`attese 4 presenze, lette ${risultato.size}`);
  });

  it("l'admin legge le presenze di una persona qualunque", async () => {
    await assertSucceeds(propria(admin(), 'dino'));
  });

  it('la persona legge le proprie presenze in tutte le edizioni', async () => {
    const risultato = await assertSucceeds(propria(approvata(), 'giulia'));
    if (risultato.size !== 2) throw new Error(`attese 2 presenze, lette ${risultato.size}`);
  });

  it('la persona non può leggere tutte le presenze senza filtro', async () => {
    await assertFails(tutte(approvata()));
  });

  it('un altro approvato non legge le presenze di giulia, né quelle senza account', async () => {
    await assertFails(propria(altroApprovato(), 'giulia'));
    await assertFails(tutte(altroApprovato()));
  });

  it('un anonimo non legge nessuna presenza', async () => {
    await assertFails(propria(anonimo(), 'giulia'));
    await assertFails(tutte(anonimo()));
  });

  it('un ospite (accesso anonimo) non fa query sul collection group: non è connesso', async () => {
    await assertFails(tutte(ospite()));
    await assertFails(
      getDocs(query(collectionGroup(ospite(), 'presenze'), where('uid', '==', 'ospite1'))),
    );
  });

  it('nessuno scrive nelle presenze del collection group, nemmeno l’admin', async () => {
    const nuova = { uid: 'marco', registrata: ORA, via: 'link' };
    await assertFails(setDoc(doc(admin(), 'edizioni/altra/presenze/marco'), nuova));
  });
});
