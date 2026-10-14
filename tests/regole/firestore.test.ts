import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { creaAmbiente } from './ambiente';

let ambiente: RulesTestEnvironment;

beforeAll(async () => {
  ambiente = await creaAmbiente();
});
beforeEach(async () => {
  await ambiente.clearFirestore();
  // Un documento creato "dall'esterno" (come farebbe la console), per provare letture e cancellazioni.
  await ambiente.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'edizioni/primavera-2027'), { titolo: 'Primavera 2027' });
  });
});
afterAll(async () => {
  await ambiente.cleanup();
});

// Punto di partenza (blocco 0): tutto chiuso, per chiunque.
describe('Firestore: tutto chiuso', () => {
  const persone = {
    'chi non ha fatto accesso': () => ambiente.unauthenticatedContext(),
    'chi ha fatto accesso': () => ambiente.authenticatedContext('arturo', { email_verified: true }),
  };

  for (const [chi, contesto] of Object.entries(persone)) {
    it(`${chi} non può leggere`, async () => {
      await assertFails(getDoc(doc(contesto().firestore(), 'edizioni/primavera-2027')));
    });
    it(`${chi} non può scrivere`, async () => {
      await assertFails(
        setDoc(doc(contesto().firestore(), 'edizioni/autunno-2027'), { titolo: 'x' }),
      );
    });
    it(`${chi} non può cancellare`, async () => {
      await assertFails(deleteDoc(doc(contesto().firestore(), 'edizioni/primavera-2027')));
    });
  }
});
