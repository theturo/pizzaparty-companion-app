// Le operazioni di accesso e registrazione (D-024): link email per verificare, poi password.
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithEmailAndPassword,
  updatePassword,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebase } from '$lib/firebase/app';
import { VERSIONE_DOCUMENTI, type Profilo } from './profilo';

/** Email ricordata sul dispositivo tra la richiesta del link e la sua apertura. */
const CHIAVE_EMAIL = 'pizzaparty-email-accesso';

function ricordaEmail(email: string): void {
  try {
    localStorage.setItem(CHIAVE_EMAIL, email);
  } catch {
    // Archivio non disponibile (es. navigazione privata): l'email verrà richiesta all'apertura del link.
  }
}

export function emailRicordata(): string | null {
  try {
    return localStorage.getItem(CHIAVE_EMAIL);
  } catch {
    return null;
  }
}

/** Passo 1: manda il link che verifica l'email e porta alla pagina "Completa". */
export async function inviaLinkRegistrazione(email: string, codiceInvito: string | null) {
  const { auth } = firebase();
  const indirizzo = new URL('/completa', location.origin);
  if (codiceInvito) indirizzo.searchParams.set('invito', codiceInvito);
  await sendSignInLinkToEmail(auth, email, { url: indirizzo.href, handleCodeInApp: true });
  ricordaEmail(email);
}

export function eLinkDiAccesso(url: string): boolean {
  return isSignInWithEmailLink(firebase().auth, url);
}

/** Passo 2: apre il link. L'email risulta verificata e la persona è connessa. */
export async function accediConLink(email: string, url: string) {
  await signInWithEmailLink(firebase().auth, email, url);
  try {
    localStorage.removeItem(CHIAVE_EMAIL);
  } catch {
    // niente da pulire
  }
}

/** Passo 3: sceglie la password e crea il profilo "in attesa" di approvazione. */
export async function completaRegistrazione(dati: {
  password: string;
  nome: string;
  avatar: string;
  invitatoDa: Profilo['invitatoDa'];
}) {
  const { auth, db } = firebase();
  const utente = auth.currentUser;
  if (!utente) throw new Error('Sessione assente');
  await updatePassword(utente, dati.password);
  await setDoc(doc(db, 'utenti', utente.uid), {
    nome: dati.nome.trim(),
    avatar: dati.avatar,
    stato: 'in_attesa',
    invitatoDa: dati.invitatoDa,
    accettazioni: {
      maggiorenne: true,
      condizioni: VERSIONE_DOCUMENTI,
      privacy: VERSIONE_DOCUMENTI,
      il: serverTimestamp(),
    },
    creato: serverTimestamp(),
  });
}

export async function accedi(email: string, password: string) {
  await signInWithEmailAndPassword(firebase().auth, email, password);
}

export async function esci() {
  await signOut(firebase().auth);
}

export async function inviaLinkPassword(email: string) {
  await sendPasswordResetEmail(firebase().auth, email, {
    url: new URL('/accedi', location.origin).href,
  });
}

/** Controlla il link "password dimenticata" e restituisce l'email a cui si riferisce. */
export async function controllaLinkPassword(codice: string): Promise<string> {
  return verifyPasswordResetCode(firebase().auth, codice);
}

export async function impostaNuovaPassword(codice: string, password: string) {
  await confirmPasswordReset(firebase().auth, codice, password);
}

export async function confermaEmail(codice: string) {
  await applyActionCode(firebase().auth, codice);
}

// ---- Approvazione e inviti (Cloud Functions, D-034) ----

async function chiama<T>(nome: string, dati?: unknown): Promise<T> {
  const { httpsCallable } = await import('firebase/functions');
  const risposta = await httpsCallable(firebase().functions, nome)(dati);
  return risposta.data as T;
}

export const approvaRichiesta = (uid: string) => chiama('approvaRichiesta', { uid });
export const rifiutaRichiesta = (uid: string) => chiama('rifiutaRichiesta', { uid });
export const rigeneraInvito = () => chiama<{ codice: string }>('rigeneraInvito');

// ---- Profilo e diritti (D-035) ----

export async function modificaProfilo(dati: { nome: string; avatar: string }) {
  const { auth, db } = firebase();
  const { updateDoc } = await import('firebase/firestore');
  const utente = auth.currentUser;
  if (!utente) throw new Error('Sessione assente');
  await updateDoc(doc(db, 'utenti', utente.uid), { nome: dati.nome.trim(), avatar: dati.avatar });
}

/** Chiede di nuovo la password: serve per le operazioni delicate (cambio password, eliminazione). */
async function confermaPassword(password: string) {
  const { EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth');
  const utente = firebase().auth.currentUser;
  if (!utente?.email) throw new Error('Sessione assente');
  await reauthenticateWithCredential(utente, EmailAuthProvider.credential(utente.email, password));
  return utente;
}

export async function cambiaPassword(attuale: string, nuova: string) {
  const utente = await confermaPassword(attuale);
  await updatePassword(utente, nuova);
}

export const esportaMieiDati = () => chiama<Record<string, unknown>>('esportaMieiDati');

export async function eliminaAccount(password: string) {
  await confermaPassword(password);
  await chiama('eliminaMioAccount');
  await signOut(firebase().auth);
}
