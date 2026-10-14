import { afterAll, beforeAll, describe, it } from 'vitest';
import { assertFails } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { ref, getBytes, uploadString } from 'firebase/storage';
import { creaAmbiente } from './ambiente';

let ambiente: RulesTestEnvironment;

beforeAll(async () => {
  ambiente = await creaAmbiente();
  await ambiente.withSecurityRulesDisabled(async (ctx) => {
    await uploadString(ref(ctx.storage(), 'foto/prova.txt'), 'pizza');
  });
});
afterAll(async () => {
  await ambiente.cleanup();
});

describe('Storage: tutto chiuso', () => {
  const persone = {
    'chi non ha fatto accesso': () => ambiente.unauthenticatedContext(),
    'chi ha fatto accesso': () => ambiente.authenticatedContext('arturo', { email_verified: true }),
  };

  for (const [chi, contesto] of Object.entries(persone)) {
    it(`${chi} non può scaricare file`, async () => {
      await assertFails(getBytes(ref(contesto().storage(), 'foto/prova.txt')));
    });
    it(`${chi} non può caricare file`, async () => {
      await assertFails(uploadString(ref(contesto().storage(), 'foto/nuova.txt'), 'ananas'));
    });
  }
});
