// Strumenti per i test: parlano con gli emulatori Firebase come farebbe la console.
const AUTH = 'http://127.0.0.1:9099';
const PROGETTO = 'demo-pizzaparty';

/** Un'email diversa per ogni test, così i test possono girare in parallelo. */
export const emailDiProva = (nome: string) =>
  `${nome}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@pizza-party.test`;

interface CodiceEmail {
  email: string;
  oobLink: string;
  requestType: 'EMAIL_SIGNIN' | 'PASSWORD_RESET' | 'VERIFY_EMAIL';
}

/** L'ultimo link che l'app ha "mandato via email" a quell'indirizzo, letto dall'emulatore. */
export async function ultimoLink(email: string, tipo: CodiceEmail['requestType']): Promise<URL> {
  for (let tentativo = 0; tentativo < 20; tentativo++) {
    const risposta = await fetch(`${AUTH}/emulator/v1/projects/${PROGETTO}/oobCodes`);
    const { oobCodes } = (await risposta.json()) as { oobCodes: CodiceEmail[] };
    const codice = oobCodes.filter((c) => c.email === email && c.requestType === tipo).at(-1);
    if (codice) return new URL(codice.oobLink);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Nessuna email ${tipo} per ${email}`);
}

/** Crea direttamente un account con password (email non verificata, senza profilo). Restituisce l'uid. */
export async function creaAccount(email: string, password: string): Promise<string> {
  const risposta = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=chiave-finta`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  if (!risposta.ok) throw new Error(`Account non creato: ${await risposta.text()}`);
  return ((await risposta.json()) as { localId: string }).localId;
}

/** Dà il permesso admin a un account, come farà lo script per Cloud Shell (D-034). */
export async function rendiAdmin(uid: string): Promise<void> {
  const risposta = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROGETTO}/accounts:update`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ localId: uid, customAttributes: JSON.stringify({ admin: true }) }),
    },
  );
  if (!risposta.ok) throw new Error(`Permesso admin non assegnato: ${await risposta.text()}`);
}
