// Configurazione web del progetto Firebase "pizzaparty-companion".
// NON è un segreto: identifica il progetto e finisce comunque nel codice scaricato dal browser.
// La sicurezza sta nelle regole di Firestore e Storage (cartella firebase/),
// nella restrizione della chiave ai domini dell'app e, più avanti, in App Check.
export const firebaseConfig = {
  apiKey: 'AIzaSyBsRdiyq_5Ha5ByGFS2ix2X-wyhxWjxcfA',
  authDomain: 'pizzaparty-companion.firebaseapp.com',
  projectId: 'pizzaparty-companion',
  storageBucket: 'pizzaparty-companion.firebasestorage.app',
  messagingSenderId: '1054091705174',
  appId: '1:1054091705174:web:0fa0409fb4166e2090f4f7',
} as const;

// Progetto finto usato dagli emulatori locali (npm run emulatori): nessun accesso ai dati reali.
export const PROGETTO_EMULATORI = 'demo-pizzaparty';

// Regione delle Cloud Functions: la stessa di Firestore (D-034).
export const REGIONE_FUNCTIONS = 'europe-west8';
