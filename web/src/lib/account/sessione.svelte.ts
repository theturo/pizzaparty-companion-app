// Stato della sessione: chi ha fatto accesso e il suo profilo, aggiornati in tempo reale.
// Firebase si carica solo qui, la prima volta che serve.
import type { Profilo } from './profilo';

export interface UtenteConnesso {
  uid: string;
  email: string;
  emailVerificata: boolean;
}

export const sessione = $state<{
  /** 'caricamento' finché Firebase non ha detto se c'è una sessione. */
  stato: 'caricamento' | 'ospite' | 'connesso';
  utente: UtenteConnesso | null;
  /** null = profilo non ancora creato (registrazione da completare). */
  profilo: Profilo | null;
  profiloCaricato: boolean;
}>({ stato: 'caricamento', utente: null, profilo: null, profiloCaricato: false });

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

  onAuthStateChanged(auth, (utente) => {
    smettiProfilo?.();
    smettiProfilo = null;
    if (!utente) {
      Object.assign(sessione, {
        stato: 'ospite',
        utente: null,
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
    smettiProfilo = onSnapshot(
      doc(db, 'utenti', utente.uid),
      (istantanea) => {
        sessione.profilo = istantanea.exists() ? (istantanea.data() as Profilo) : null;
        sessione.profiloCaricato = true;
      },
      () => {
        sessione.profilo = null;
        sessione.profiloCaricato = true;
      },
    );
  });
}
