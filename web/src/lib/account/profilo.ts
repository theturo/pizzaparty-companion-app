// Modello del profilo (utenti/{uid}) e controlli dei campi.
// I limiti devono restare allineati con firebase/firestore.rules.
import { ID_AVATAR } from './avatar';

export type StatoAccount = 'in_attesa' | 'approvato' | 'sospeso';

/** Versione di informativa e condizioni d'uso accettate (D-031). Cambia quando cambiano i testi. */
export const VERSIONE_DOCUMENTI = '2026-10';

export const NOME_MIN = 2;
export const NOME_MAX = 40;
export const INVITO_TESTO_MAX = 80;
export const PASSWORD_MIN = 8;

export interface Profilo {
  nome: string;
  avatar: string;
  stato: StatoAccount;
  /** Chi ha invitato la persona: codice del link d'invito, oppure il nome scritto a mano. */
  invitatoDa: { codice: string | null; testo: string | null };
  accettazioni: { maggiorenne: true; condizioni: string; privacy: string; il: unknown };
  /** Data di creazione (timestamp del server). */
  creato: unknown;
  /** Scritti dalle Cloud Functions all'approvazione (D-034). */
  codiceInvito?: string;
  approvatoIl?: unknown;
}

export function controllaNome(nome: string): string | null {
  const n = nome.trim();
  if (n.length < NOME_MIN) return 'Scrivi il tuo nome (almeno 2 lettere).';
  if (n.length > NOME_MAX) return `Il nome può avere al massimo ${NOME_MAX} caratteri.`;
  return null;
}

export function controllaPassword(password: string, conferma: string): string | null {
  if (password.length < PASSWORD_MIN)
    return `La password deve avere almeno ${PASSWORD_MIN} caratteri.`;
  if (password !== conferma) return 'Le due password non coincidono.';
  return null;
}

export const avatarValido = (id: string): boolean => ID_AVATAR.includes(id);

/** Codice d'invito ammesso nei link (lettere, numeri, trattini). */
export const codiceInvitoValido = (codice: string): boolean => /^[a-zA-Z0-9-]{4,32}$/.test(codice);
