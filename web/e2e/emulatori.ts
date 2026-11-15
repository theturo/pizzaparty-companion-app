// Strumenti per i test: parlano con gli emulatori Firebase come farebbe la console.
const AUTH = 'http://127.0.0.1:9099';
const PROGETTO = 'demo-pizzaparty';

/** Un'email diversa per ogni test, così i test possono girare in parallelo. */
export const emailDiProva = (nome: string) =>
  `${nome}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@pizza-party.test`;

interface CodiceEmail {
  email: string;
  oobLink: string;
  requestType: 'EMAIL_SIGNIN' | 'PASSWORD_RESET' | 'VERIFY_EMAIL' | 'RECOVER_EMAIL';
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

/**
 * Scrive il profilo di un account direttamente nell'emulatore di Firestore (come farebbe l'admin
 * con lo stato): serve a provare gli stati "approvato" e "sospeso" senza passare dal pannello.
 */
export async function creaProfilo(
  uid: string,
  stato: 'in_attesa' | 'approvato' | 'sospeso',
  nome = 'Ospite di prova',
): Promise<void> {
  const documento = {
    fields: {
      nome: { stringValue: nome },
      avatar: { stringValue: 'margherita' },
      stato: { stringValue: stato },
      invitatoDa: {
        mapValue: { fields: { codice: { nullValue: null }, testo: { nullValue: null } } },
      },
      accettazioni: {
        mapValue: {
          fields: {
            maggiorenne: { booleanValue: true },
            condizioni: { stringValue: '2026-10' },
            privacy: { stringValue: '2026-10' },
            il: { timestampValue: new Date().toISOString() },
          },
        },
      },
      creato: { timestampValue: new Date().toISOString() },
    },
  };
  const risposta = await fetch(
    `http://127.0.0.1:8080/v1/projects/${PROGETTO}/databases/(default)/documents/utenti/${uid}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify(documento),
    },
  );
  if (!risposta.ok) throw new Error(`Profilo non scritto: ${await risposta.text()}`);
}

/** Scrive i permessi sul token (custom claims), come fanno le Functions e lo script per Cloud Shell. */
async function impostaPermessi(uid: string, permessi: Record<string, boolean>): Promise<void> {
  const risposta = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROGETTO}/accounts:update`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ localId: uid, customAttributes: JSON.stringify(permessi) }),
    },
  );
  if (!risposta.ok) throw new Error(`Permessi non assegnati: ${await risposta.text()}`);
}

/**
 * Un account già approvato, pronto ad accedere con la password data. Restituisce l'uid.
 * Come approvaRichiesta: profilo "approvato" e permesso "approvato" sul token (le regole lo richiedono).
 */
export async function creaUtenteApprovato(email: string, password: string): Promise<string> {
  const uid = await creaAccount(email, password);
  await creaProfilo(uid, 'approvato');
  await impostaPermessi(uid, { approvato: true });
  return uid;
}

/** Dà il permesso admin a un account approvato, come lo script per Cloud Shell (D-034). */
export async function rendiAdmin(uid: string): Promise<void> {
  await impostaPermessi(uid, { admin: true, approvato: true });
}

/** Cambia l'email di un account come farebbe l'utente stesso: Firebase prepara il link per annullarlo. */
export async function cambiaEmail(email: string, password: string, nuova: string): Promise<void> {
  const chiama = async (metodo: string, corpo: object) => {
    const risposta = await fetch(
      `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:${metodo}?key=chiave-finta`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      },
    );
    if (!risposta.ok) throw new Error(`${metodo}: ${await risposta.text()}`);
    return (await risposta.json()) as { idToken: string };
  };
  const { idToken } = await chiama('signInWithPassword', {
    email,
    password,
    returnSecureToken: true,
  });
  await chiama('update', { idToken, email: nuova, returnSecureToken: true });
}

const EDIZIONI = `http://127.0.0.1:8080/v1/projects/${PROGETTO}/databases/(default)/documents/edizioni`;

export interface EdizioneDiProva {
  nome: string;
  quando:
    | { tipo: 'data'; data: string; inizio?: string; fine?: string }
    | { tipo: 'periodo'; periodo: string };
  stato: 'bozza' | 'annunciata' | 'conclusa' | 'annullata';
  tema?: string;
}

/** Il giorno di Roma, `giorniDopo` giorni da oggi, come AAAA-MM-GG (per le edizioni del check-in). */
export function giornoRoma(giorniDopo = 0): string {
  const oggi = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
  const [anno, mese, giorno] = oggi.split('-').map(Number);
  return new Date(Date.UTC(anno, mese - 1, giorno + giorniDopo)).toISOString().slice(0, 10);
}

/** Scrive un'edizione nell'emulatore come farebbe il pannello admin (con il permesso di owner). */
export async function creaEdizione(id: string, dati: EdizioneDiProva): Promise<void> {
  const quando =
    dati.quando.tipo === 'data'
      ? {
          tipo: { stringValue: 'data' },
          data: { stringValue: dati.quando.data },
          ...(dati.quando.inizio ? { inizio: { stringValue: dati.quando.inizio } } : {}),
          ...(dati.quando.fine ? { fine: { stringValue: dati.quando.fine } } : {}),
        }
      : { tipo: { stringValue: 'periodo' }, periodo: { stringValue: dati.quando.periodo } };
  const adesso = new Date().toISOString();
  const documento = {
    fields: {
      nome: { stringValue: dati.nome },
      quando: { mapValue: { fields: quando } },
      tema: { stringValue: dati.tema ?? 'pizzaparty-2026' },
      quota: {
        mapValue: {
          fields: {
            singolo: { integerValue: '5' },
            conAccompagnatore: { integerValue: '10' },
          },
        },
      },
      pagamenti: {
        mapValue: {
          fields: {
            paypal: { booleanValue: true },
            satispay: { booleanValue: true },
            contanti: { booleanValue: true },
          },
        },
      },
      stato: { stringValue: dati.stato },
      creato: { timestampValue: adesso },
      aggiornato: { timestampValue: adesso },
    },
  };
  const risposta = await fetch(`${EDIZIONI}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify(documento),
  });
  if (!risposta.ok) throw new Error(`Edizione non scritta: ${await risposta.text()}`);
}

/** La scheda pubblica di un approvato (nome e avatar), come la scrive approvaRichiesta. */
export async function creaSchedaPubblica(uid: string, nome: string): Promise<void> {
  const documento = {
    fields: { nome: { stringValue: nome }, avatar: { stringValue: 'margherita' } },
  };
  const risposta = await fetch(
    `http://127.0.0.1:8080/v1/projects/${PROGETTO}/databases/(default)/documents/profili/${uid}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify(documento),
    },
  );
  if (!risposta.ok) throw new Error(`Scheda non scritta: ${await risposta.text()}`);
}

/**
 * Una presenza già registrata, scritta come la Function di check-in (con il permesso di owner).
 * Serve ai test della Home, che non passano dal QR.
 */
export async function registraPresenzaDiProva(idEdizione: string, uid: string): Promise<void> {
  const documento = {
    fields: {
      uid: { stringValue: uid },
      registrata: { timestampValue: new Date().toISOString() },
      via: { stringValue: 'link' },
    },
  };
  const risposta = await fetch(`${EDIZIONI}/${idEdizione}/presenze/${uid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify(documento),
  });
  if (!risposta.ok) throw new Error(`Presenza non scritta: ${await risposta.text()}`);
}

/** Toglie tutte le edizioni dall'emulatore: i test della Home partono da un elenco vuoto. */
export async function svuotaEdizioni(): Promise<void> {
  const risposta = await fetch(EDIZIONI, { headers: { Authorization: 'Bearer owner' } });
  if (!risposta.ok) throw new Error(`Edizioni non lette: ${await risposta.text()}`);
  const { documents = [] } = (await risposta.json()) as { documents?: { name: string }[] };
  for (const documento of documents) {
    const cancellata = await fetch(`http://127.0.0.1:8080/v1/${documento.name}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer owner' },
    });
    if (!cancellata.ok) throw new Error(`Edizione non cancellata: ${await cancellata.text()}`);
  }
}
