import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc, deleteDoc } from 'firebase/firestore';
import { creaAmbiente } from './ambiente';

let ambiente: RulesTestEnvironment;

beforeAll(async () => {
  ambiente = await creaAmbiente();
});
beforeEach(async () => {
  await ambiente.clearFirestore();
  // Dati come li scrivono le Cloud Functions.
  await ambiente.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'utenti/giulia'), { nome: 'Giulia', stato: 'approvato' });
    await setDoc(doc(db, 'profili/giulia'), { nome: 'Giulia', avatar: 'diavola' });
    await setDoc(doc(db, 'richieste/dino'), { email: 'dino@pizza-party.test', nome: 'Dino' });
    await setDoc(doc(db, 'inviti/k7m2-9qxt'), { proprietario: 'giulia' });
  });
});
afterAll(async () => {
  await ambiente.cleanup();
});

const admin = () =>
  ambiente.authenticatedContext('arturo', { email_verified: true, admin: true }).firestore();
const approvato = () =>
  ambiente.authenticatedContext('giulia', { email_verified: true, approvato: true }).firestore();
const inAttesa = () => ambiente.authenticatedContext('dino', { email_verified: true }).firestore();
const anonimo = () => ambiente.unauthenticatedContext().firestore();

describe("richieste in attesa (con l'email)", () => {
  it("l'admin le vede, una per una e in elenco", async () => {
    await assertSucceeds(getDoc(doc(admin(), 'richieste/dino')));
    await assertSucceeds(getDocs(collection(admin(), 'richieste')));
  });

  it('nessun altro le vede, nemmeno chi ha fatto la richiesta', async () => {
    await assertFails(getDoc(doc(approvato(), 'richieste/dino')));
    await assertFails(getDoc(doc(inAttesa(), 'richieste/dino')));
    await assertFails(getDocs(collection(anonimo(), 'richieste')));
  });

  it('dal telefono non si scrivono né si cancellano, neanche da admin', async () => {
    await assertFails(setDoc(doc(admin(), 'richieste/nuova'), { email: 'x@y.z' }));
    await assertFails(deleteDoc(doc(admin(), 'richieste/dino')));
  });
});

describe('schede pubbliche (nome e avatar)', () => {
  it("le vedono gli approvati e l'admin", async () => {
    await assertSucceeds(getDoc(doc(approvato(), 'profili/giulia')));
    await assertSucceeds(getDocs(collection(approvato(), 'profili')));
    await assertSucceeds(getDoc(doc(admin(), 'profili/giulia')));
  });

  it('non le vede chi è in attesa né chi non ha fatto accesso (D-009)', async () => {
    await assertFails(getDoc(doc(inAttesa(), 'profili/giulia')));
    await assertFails(getDocs(collection(anonimo(), 'profili')));
  });

  it('dal telefono non si scrivono, neanche la propria', async () => {
    await assertFails(setDoc(doc(approvato(), 'profili/giulia'), { nome: 'Giulia', avatar: 'x' }));
  });
});

describe('profili privati', () => {
  it("l'admin vede il profilo privato di chiunque", async () => {
    await assertSucceeds(getDoc(doc(admin(), 'utenti/giulia')));
  });

  it('un approvato non vede il profilo privato degli altri', async () => {
    await assertFails(getDoc(doc(approvato(), 'utenti/dino')));
  });
});

describe("codici d'invito", () => {
  it('nessuno li legge dal telefono (li risolvono le Functions)', async () => {
    await assertFails(getDoc(doc(approvato(), 'inviti/k7m2-9qxt')));
    await assertFails(getDoc(doc(admin(), 'inviti/k7m2-9qxt')));
    await assertFails(getDocs(collection(anonimo(), 'inviti')));
  });
});
