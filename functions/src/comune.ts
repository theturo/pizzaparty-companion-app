// Elementi comuni alle Cloud Functions (D-034).
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { randomBytes } from 'node:crypto';

initializeApp();

export const db = getFirestore();
export const auth = getAuth();

/** Stessa regione di Firestore: i trigger del database devono stare lì. */
export const REGIONE = 'europe-west8';

/**
 * Opzioni delle Functions chiamate dall'app. "public" vuol dire che le richieste arrivano
 * al nostro codice, che poi controlla chi chiama (accesso, admin). Va dichiarato qui:
 * Firebase lo imposta a ogni pubblicazione, non solo quando crea la Function.
 */
export const CHIAMABILE = { region: REGIONE, invoker: 'public' } as const;

/** Permessi speciali sul token (custom claims), letti anche dalle regole. */
export interface Permessi {
  admin?: boolean;
  approvato?: boolean;
}

/** Interrompe la chiamata se chi la fa non è admin. Restituisce il suo uid. */
export function soloAdmin(richiesta: CallableRequest): string {
  if (!richiesta.auth) throw new HttpsError('unauthenticated', 'Serve aver fatto accesso.');
  if (richiesta.auth.token.admin !== true)
    throw new HttpsError('permission-denied', 'Solo un admin può farlo.');
  return richiesta.auth.uid;
}

/** Legge un uid passato dal telefono, controllandone la forma. */
export function uidValido(valore: unknown): string {
  if (typeof valore !== 'string' || !/^[A-Za-z0-9]{1,128}$/.test(valore))
    throw new HttpsError('invalid-argument', 'Utente non valido.');
  return valore;
}

/** Aggiunge permessi a quelli già presenti sull'account, senza cancellarli. */
export async function aggiungiPermessi(uid: string, nuovi: Permessi): Promise<void> {
  const utente = await auth.getUser(uid);
  await auth.setCustomUserClaims(uid, { ...(utente.customClaims ?? {}), ...nuovi });
}

/** Alfabeto dei codici: niente caratteri ambigui (0/o, 1/l/i). */
const ALFABETO_CODICI = 'abcdefghjkmnpqrstuvwxyz23456789';

/** Codice leggibile e difficile da indovinare: `gruppi` blocchi di 4 caratteri separati da "-". */
export function generaCodiceGruppi(gruppi: number): string {
  const byte = randomBytes(gruppi * 4);
  const caratteri = [...byte].map((b) => ALFABETO_CODICI[b % ALFABETO_CODICI.length]);
  const blocchi: string[] = [];
  for (let i = 0; i < caratteri.length; i += 4) blocchi.push(caratteri.slice(i, i + 4).join(''));
  return blocchi.join('-');
}

/** Codice d'invito leggibile e difficile da indovinare (es. "k7m2-9qxt"). */
export function generaCodiceInvito(): string {
  return generaCodiceGruppi(2);
}
