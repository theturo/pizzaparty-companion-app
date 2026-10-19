// Messaggi in italiano per gli errori di Firebase Authentication.
// Per non rivelare quali email sono registrate, "utente inesistente" e "password errata"
// danno lo stesso messaggio.

const MESSAGGI: Record<string, string> = {
  'auth/invalid-email': "L'indirizzo email non è valido.",
  'auth/invalid-credential': 'Email o password non corrette.',
  'auth/wrong-password': 'Email o password non corrette.',
  'auth/user-not-found': 'Email o password non corrette.',
  'auth/too-many-requests': 'Troppi tentativi. Riprova tra qualche minuto.',
  'auth/network-request-failed': 'Connessione assente o instabile. Riprova appena c’è rete.',
  'auth/invalid-action-code': 'Il link non è più valido: forse è già stato usato o è scaduto.',
  'auth/expired-action-code': 'Il link è scaduto: richiedine uno nuovo.',
  'auth/weak-password': 'La password è troppo debole: usane una più lunga.',
  'auth/password-does-not-meet-requirements': 'La password è troppo debole: usane una più lunga.',
  'auth/requires-recent-login': 'Per sicurezza, esci e accedi di nuovo prima di questa operazione.',
  'auth/user-disabled': 'Questo account è stato disattivato.',
  'functions/permission-denied': 'Non hai il permesso per farlo.',
  'functions/failed-precondition': 'Questa richiesta è già stata gestita.',
  'functions/unavailable': 'Il server non risponde. Riprova tra poco.',
};

export function messaggioErrore(errore: unknown): string {
  const codice = (errore as { code?: string })?.code;
  return (codice && MESSAGGI[codice]) || 'Qualcosa è andato storto. Riprova.';
}
