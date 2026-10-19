// Stato della sessione: chi ha fatto accesso, i suoi permessi e il suo profilo, in tempo reale.
// Firebase si carica solo qui, la prima volta che serve.
import type { Profilo } from './profilo';

export interface UtenteConnesso {
  uid: string;
  email: string;
  emailVerificata: boolean;
}

/** Permessi speciali sul token (custom claims), assegnati dalle Cloud Functions (D-034). */
export interface Permessi {
  admin: boolean;
  approvato: boolean;
}

const NESSUN_PERMESSO: Permessi = { admin: false, approvato: false };

export const sessione = $state<{
  /** 'caricamento' finché Firebase non ha detto se c'è una sessione. */
  stato: 'caricamento' | 'ospite' | 'connesso';
  utente: UtenteConnesso | null;
  permessi: Permessi;
  /** null = profilo non ancora creato (registrazione da completare). */
  profilo: Profilo | null;
  profiloCaricato: boolean;
}>({
  stato: 'caricamento',
  utente: null,
  permessi: NESSUN_PERMESSO,
  profilo: null,
  profiloCaricato: false,
});

let avviata = false;

export async function avviaSessione(): Promise<void> {
  if (avviata || !__ACCOUNT_ATTIVI__) return;
  avviata = true;
  const [{ firebase }, { onAuthStateChanged }, { doc, onSnapshot }] = await Promise.all([
    import('$lib/firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]);
  const { auth, db } = firebase();
  let smettiProfilo: (() => void) | null = null;

  /** Rilegge i permessi dal token; con `forza` ne chiede uno nuovo al server. */
  async function leggiPermessi(forza = false) {
    const utente = auth.currentUser;
    if (!utente) return;
    const { claims } = await utente.getIdTokenResult(forza);
    sessione.permessi = { admin: claims.admin === true, approvato: claims.approvato === true };
  }

  onAuthStateChanged(auth, (utente) => {
    smettiProfilo?.();
    smettiProfilo = null;
    if (!utente) {
      Object.assign(sessione, {
        stato: 'ospite',
        utente: null,
        permessi: NESSUN_PERMESSO,
        profilo: null,
        profiloCaricato: true,
      });
      return;
    }
    sessione.stato = 'connesso';
    sessione.utente = {
      uid: utente.uid,
      email: utente.email ?? '',
      emailVerificata: utente.emailVerified,
    };
    sessione.profiloCaricato = false;
    void leggiPermessi();
    smettiProfilo = onSnapshot(
      doc(db, 'utenti', utente.uid),
      (istantanea) => {
        sessione.profilo = istantanea.exists() ? (istantanea.data() as Profilo) : null;
        sessione.profiloCaricato = true;
        // Appena l'admin approva, il token va rinnovato per avere il permesso "approvato".
        if (sessione.profilo?.stato === 'approvato' && !sessione.permessi.approvato) {
          void leggiPermessi(true);
        }
      },
      () => {
        sessione.profilo = null;
        sessione.profiloCaricato = true;
      },
    );
  });
}
