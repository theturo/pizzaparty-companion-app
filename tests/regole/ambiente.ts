// Ambiente di prova condiviso dai test delle regole: legge le regole dai file della repo
// e si collega agli emulatori avviati da `firebase emulators:exec`.
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';

export const PROGETTO = 'demo-pizzaparty';

export async function creaAmbiente(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROGETTO,
    firestore: { rules: readFileSync('firebase/firestore.rules', 'utf8') },
    storage: { rules: readFileSync('firebase/storage.rules', 'utf8') },
  });
}
