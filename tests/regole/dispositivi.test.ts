import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { creaAmbiente } from './ambiente';

let ambiente: RulesTestEnvironment;

beforeAll(async () => {
  ambiente = await creaAmbiente();
});
beforeEach(async () => {
  await ambiente.clearFirestore();
});
afterAll(async () => {
  await ambiente.cleanup();
});

const persona = (uid: string, permessi: Record<string, unknown> = {}) =>
  ambiente.authenticatedContext(uid, { email_verified: true, ...permessi }).firestore();
const dispositivo = (piattaforma = 'Android · Chrome') => ({
  piattaforma,
  creato: serverTimestamp(),
});
const percorso = 'utenti/dino/dispositivi/codice-del-telefono';

describe('dispositivi con le notifiche (D-036)', () => {
  it('la persona registra, legge e toglie il proprio dispositivo', async () => {
    await assertSucceeds(setDoc(doc(persona('dino'), percorso), dispositivo()));
    await assertSucceeds(getDoc(doc(persona('dino'), percorso)));
    await assertSucceeds(deleteDoc(doc(persona('dino'), percorso)));
  });

  it("nessun altro li vede o li tocca, neanche l'admin dal telefono", async () => {
    await assertSucceeds(setDoc(doc(persona('dino'), percorso), dispositivo()));
    await assertFails(getDoc(doc(persona('giulia', { approvato: true }), percorso)));
    await assertFails(getDoc(doc(persona('arturo', { admin: true }), percorso)));
    await assertFails(
      setDoc(doc(persona('intruso'), 'utenti/dino/dispositivi/altro'), dispositivo()),
    );
    await assertFails(deleteDoc(doc(persona('intruso'), percorso)));
  });

  it('niente campi in più, testi lunghi o date inventate', async () => {
    await assertFails(setDoc(doc(persona('dino'), percorso), { ...dispositivo(), extra: true }));
    await assertFails(setDoc(doc(persona('dino'), percorso), dispositivo('x'.repeat(41))));
    await assertFails(
      setDoc(doc(persona('dino'), percorso), {
        piattaforma: 'iPhone',
        creato: new Date(2020, 0, 1),
      }),
    );
  });

  it('non si modificano: si tolgono e si registrano di nuovo', async () => {
    await assertSucceeds(setDoc(doc(persona('dino'), percorso), dispositivo()));
    await assertFails(updateDoc(doc(persona('dino'), percorso), { piattaforma: 'Altro' }));
  });
});
