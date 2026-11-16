import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { getBytes, ref, uploadString } from 'firebase/storage';
import { creaAmbiente } from './ambiente';

// Ospiti senza account (D-065–D-068): l'accesso anonimo non è "connesso", legge solo la propria
// presenza, e i segnaposto li vede solo l'admin.
let ambiente: RulesTestEnvironment;
const ORA = Timestamp.fromDate(new Date('2026-12-19T18:00:00Z'));

beforeAll(async () => {
  ambiente = await creaAmbiente();
});
beforeEach(async () => {
  await ambiente.clearFirestore();
  await ambiente.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'edizioni/festa'), {
      nome: 'Festa',
      quando: { tipo: 'data', data: '2026-12-19' },
      tema: 'pizzaparty-2026',
      quota: { singolo: 5, conAccompagnatore: 10 },
      pagamenti: { paypal: true, satispay: true, contanti: true },
      stato: 'annunciata',
      creato: ORA,
      aggiornato: ORA,
    });
    await setDoc(doc(db, 'utenti/giulia'), { nome: 'Giulia', stato: 'approvato' });
    await setDoc(doc(db, 'profili/giulia'), { nome: 'Giulia', avatar: 'pomodoro' });
    await setDoc(doc(db, 'edizioni/festa/presenze/giulia'), {
      uid: 'giulia',
      registrata: ORA,
      via: 'link',
    });
    await setDoc(doc(db, 'edizioni/festa/presenze/ospite1'), {
      uid: 'ospite1',
      registrata: ORA,
      via: 'link',
      tipo: 'ospite',
      segnaposto: 'seg1',
      nome: 'Luca',
      nomeNormalizzato: 'luca',
    });
    await setDoc(doc(db, 'segnaposto/seg1'), {
      nome: 'Luca',
      nomeNormalizzato: 'luca',
      creato: ORA,
      origine: 'ospite',
      edizione: 'festa',
    });
  });
});
afterAll(async () => {
  await ambiente.cleanup();
});

// L'accesso anonimo di Firebase: il token dichiara il fornitore "anonymous", senza email.
const ospite = (uid = 'ospite1') =>
  ambiente.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const admin = () =>
  ambiente.authenticatedContext('arturo', { email_verified: true, admin: true }).firestore();
const approvata = () =>
  ambiente.authenticatedContext('giulia', { email_verified: true, approvato: true }).firestore();

describe('ospite: non è connesso', () => {
  it('non legge il profilo privato, né quelli pubblici, né le edizioni riservate', async () => {
    await assertFails(getDoc(doc(ospite(), 'utenti/giulia')));
    await assertFails(getDoc(doc(ospite(), 'profili/giulia')));
    await assertFails(getDoc(doc(ospite(), 'edizioni/festa')));
    await assertFails(getDoc(doc(ospite(), 'richieste/giulia')));
  });

  it('non crea il proprio utente, né dispositivi per le notifiche', async () => {
    const profilo = {
      nome: 'Luca',
      avatar: 'pizza',
      stato: 'in_attesa',
      invitatoDa: { codice: null, testo: 'x' },
      accettazioni: { maggiorenne: true, condizioni: '2026-12', privacy: '2026-12', il: ORA },
      creato: serverTimestamp(),
    };
    await assertFails(setDoc(doc(ospite(), 'utenti/ospite1'), profilo));
    await assertFails(
      setDoc(doc(ospite(), 'utenti/ospite1/dispositivi/codice'), {
        piattaforma: 'iPhone',
        creato: serverTimestamp(),
      }),
    );
  });

  it('non legge i propri file: Storage resta chiuso anche per l’accesso anonimo', async () => {
    await ambiente.withSecurityRulesDisabled(async (ctx) => {
      await uploadString(ref(ctx.storage(), 'foto/prova-ospite.txt'), 'pizza');
    });
    const storage = ambiente
      .authenticatedContext('ospite1', {
        firebase: { sign_in_provider: 'anonymous' },
      })
      .storage();
    await assertFails(getBytes(ref(storage, 'foto/prova-ospite.txt')));
    await assertFails(uploadString(ref(storage, 'foto/da-ospite.txt'), 'ananas'));
  });
});

describe('ospite: la propria presenza', () => {
  it('legge la propria presenza, ma non quelle degli altri', async () => {
    await assertSucceeds(getDoc(doc(ospite(), 'edizioni/festa/presenze/ospite1')));
    await assertFails(getDoc(doc(ospite(), 'edizioni/festa/presenze/giulia')));
  });

  it('non crea, non modifica e non cancella presenze', async () => {
    await assertFails(
      setDoc(doc(ospite(), 'edizioni/festa/presenze/ospite2'), {
        uid: 'ospite2',
        registrata: ORA,
        via: 'link',
      }),
    );
    await assertFails(setDoc(doc(ospite(), 'edizioni/festa/presenze/ospite1'), { via: 'x' }));
    await assertFails(deleteDoc(doc(ospite(), 'edizioni/festa/presenze/ospite1')));
  });
});

describe('segnaposto degli ospiti', () => {
  it("li legge solo l'admin", async () => {
    await assertSucceeds(getDoc(doc(admin(), 'segnaposto/seg1')));
    await assertFails(getDoc(doc(approvata(), 'segnaposto/seg1')));
    await assertFails(getDoc(doc(ospite(), 'segnaposto/seg1')));
  });

  it('nessuno li crea o li modifica dal client, nemmeno l’admin', async () => {
    const nuovo = { nome: 'Marco', origine: 'ospite', edizione: 'festa', creato: ORA };
    await assertFails(setDoc(doc(admin(), 'segnaposto/seg2'), nuovo));
    await assertFails(setDoc(doc(admin(), 'segnaposto/seg1'), { nome: 'Altro' }));
    await assertFails(setDoc(doc(ospite(), 'segnaposto/seg2'), nuovo));
  });

  it("l'admin può cancellarli, gli altri no", async () => {
    await assertFails(deleteDoc(doc(approvata(), 'segnaposto/seg1')));
    await assertFails(deleteDoc(doc(ospite(), 'segnaposto/seg1')));
    await assertSucceeds(deleteDoc(doc(admin(), 'segnaposto/seg1')));
  });
});

describe('annullamento dell’ospite da parte dell’admin', () => {
  it("l'admin cancella la presenza; poi il segnaposto", async () => {
    await assertSucceeds(deleteDoc(doc(admin(), 'edizioni/festa/presenze/ospite1')));
    await assertSucceeds(deleteDoc(doc(admin(), 'segnaposto/seg1')));
  });

  it('chi non è admin non cancella la presenza di un ospite', async () => {
    await assertFails(deleteDoc(doc(approvata(), 'edizioni/festa/presenze/ospite1')));
  });
});
