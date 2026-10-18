// Avvio di Firebase, caricato solo quando serve (le pagine senza account non lo scaricano).
// In sviluppo e nei test si collega agli emulatori con il progetto finto: mai ai dati reali.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
  type Auth,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';
import { firebaseConfig, PROGETTO_EMULATORI } from './config';

export interface Firebase {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let istanza: Firebase | null = null;

export function firebase(): Firebase {
  if (istanza) return istanza;

  const app = initializeApp(
    __EMULATORI__ ? { ...firebaseConfig, projectId: PROGETTO_EMULATORI } : firebaseConfig,
  );
  // Sessione salvata sul dispositivo; nessun "risolutore" per popup/redirect: niente iframe esterni.
  const auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  });
  auth.languageCode = 'it';
  // Cache locale: i dati restano disponibili anche con la rete scarsa della festa.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });

  if (__EMULATORI__) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

  istanza = { app, auth, db };
  return istanza;
}
