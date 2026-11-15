import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { creaAmbiente } from './ambiente';

// Check-in con il link (D-058): riservato, codiciCheckin, presenze, orari dell'edizione.
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
    await setDoc(doc(db, 'edizioni/festa/riservato/checkin'), {
      codice: 'abcd-efgh-jkmn',
      aggiornato: ORA,
    });
    await setDoc(doc(db, 'codiciCheckin/abcd-efgh-jkmn'), { edizione: 'festa', creato: ORA });
    await setDoc(doc(db, 'edizioni/festa/presenze/giulia'), {
      uid: 'giulia',
      registrata: ORA,
      via: 'link',
    });
    await setDoc(doc(db, 'edizioni/festa/presenze/dino'), {
      uid: 'dino',
      registrata: ORA,
      via: 'link',
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

describe('riservato/checkin: il codice segreto', () => {
  it("solo l'admin lo legge", async () => {
    await assertSucceeds(getDoc(doc(admin(), 'edizioni/festa/riservato/checkin')));
    await assertFails(getDoc(doc(approvata(), 'edizioni/festa/riservato/checkin')));
    await assertFails(getDoc(doc(anonimo(), 'edizioni/festa/riservato/checkin')));
  });

  it('nessuno lo scrive dal client, nemmeno l’admin', async () => {
    await assertFails(
      setDoc(doc(admin(), 'edizioni/festa/riservato/checkin'), { codice: 'x', aggiornato: ORA }),
    );
    await assertFails(deleteDoc(doc(admin(), 'edizioni/festa/riservato/checkin')));
  });
});

describe('codiciCheckin: la mappa dal codice', () => {
  it('nessuno la legge o la scrive, nemmeno l’admin', async () => {
    await assertFails(getDoc(doc(admin(), 'codiciCheckin/abcd-efgh-jkmn')));
    await assertFails(getDoc(doc(approvata(), 'codiciCheckin/abcd-efgh-jkmn')));
    await assertFails(
      setDoc(doc(admin(), 'codiciCheckin/nuovo-codice-prova'), { edizione: 'festa', creato: ORA }),
    );
    await assertFails(deleteDoc(doc(admin(), 'codiciCheckin/abcd-efgh-jkmn')));
  });
});

describe('presenze: lettura', () => {
  it("l'admin legge tutte le presenze", async () => {
    await assertSucceeds(getDoc(doc(admin(), 'edizioni/festa/presenze/giulia')));
    await assertSucceeds(getDoc(doc(admin(), 'edizioni/festa/presenze/dino')));
  });

  it('la persona legge solo la propria presenza', async () => {
    await assertSucceeds(getDoc(doc(approvata(), 'edizioni/festa/presenze/giulia')));
    await assertFails(getDoc(doc(approvata(), 'edizioni/festa/presenze/dino')));
  });

  it('un altro approvato non legge le presenze degli altri, né chi non ha fatto accesso', async () => {
    await assertFails(getDoc(doc(altroApprovato(), 'edizioni/festa/presenze/giulia')));
    await assertFails(getDoc(doc(anonimo(), 'edizioni/festa/presenze/giulia')));
  });
});

describe('presenze: scrittura', () => {
  it('nessuno le crea o le modifica dal client, nemmeno la persona stessa', async () => {
    const nuova = { uid: 'marco', registrata: ORA, via: 'link' };
    await assertFails(setDoc(doc(approvata(), 'edizioni/festa/presenze/giulia'), nuova));
    await assertFails(setDoc(doc(altroApprovato(), 'edizioni/festa/presenze/marco'), nuova));
    await assertFails(setDoc(doc(admin(), 'edizioni/festa/presenze/marco'), nuova));
    await assertFails(setDoc(doc(approvata(), 'edizioni/festa/presenze/giulia'), { via: 'x' }));
  });

  it("solo l'admin cancella una presenza (annullamento)", async () => {
    await assertFails(deleteDoc(doc(approvata(), 'edizioni/festa/presenze/giulia')));
    await assertFails(deleteDoc(doc(altroApprovato(), 'edizioni/festa/presenze/giulia')));
    await assertSucceeds(deleteDoc(doc(admin(), 'edizioni/festa/presenze/giulia')));
  });
});

describe('orari dell’edizione (regole)', () => {
  const base = {
    nome: 'Festa',
    tema: 'pizzaparty-2026',
    quota: { singolo: 5, conAccompagnatore: 10 },
    pagamenti: { paypal: true, satispay: true, contanti: true },
    stato: 'bozza',
    creato: serverTimestamp(),
    aggiornato: serverTimestamp(),
  };

  it('accetta orari HH:MM, anche la fine dopo mezzanotte e le edizioni senza orari', async () => {
    const db = admin();
    await assertSucceeds(
      setDoc(doc(db, 'edizioni/orari-ok'), {
        ...base,
        quando: { tipo: 'data', data: '2027-05-22', inizio: '19:30', fine: '00:15' },
      }),
    );
    await assertSucceeds(
      setDoc(doc(db, 'edizioni/senza-orari'), {
        ...base,
        quando: { tipo: 'data', data: '2027-05-22' },
      }),
    );
  });

  it('rifiuta orari non validi o con campi in più', async () => {
    const db = admin();
    const quando = [
      { tipo: 'data', data: '2027-05-22', inizio: '24:00' },
      { tipo: 'data', data: '2027-05-22', fine: '7:30' },
      { tipo: 'data', data: '2027-05-22', inizio: '19.30' },
      { tipo: 'data', data: '2027-05-22', inizio: 1930 },
      { tipo: 'data', data: '2027-05-22', orario: '19:30' },
    ];
    for (const [indice, q] of quando.entries()) {
      await assertFails(setDoc(doc(db, `edizioni/orari-no-${indice}`), { ...base, quando: q }));
    }
  });
});
