import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { creaAmbiente } from './ambiente';

let ambiente: RulesTestEnvironment;

// Data di creazione fissa: in modifica la regola vuole che "creato" resti quello di prima.
const CREATO = Timestamp.fromDate(new Date('2026-11-01T10:00:00Z'));

beforeAll(async () => {
  ambiente = await creaAmbiente();
});
beforeEach(async () => {
  await ambiente.clearFirestore();
  // Dati come li scrive l'app dell'admin, con il server che mette i timestamp.
  await ambiente.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const base = { nome: 'Edizione', quando: { tipo: 'periodo', periodo: 'Maggio 2027' } };
    const quota = { singolo: 5, conAccompagnatore: 10 };
    const pagamenti = { paypal: true, satispay: true, contanti: true };
    const dati = {
      ...base,
      tema: 'pizzaparty-2026',
      quota,
      pagamenti,
      creato: CREATO,
      aggiornato: CREATO,
    };
    await setDoc(doc(db, 'edizioni/bozza'), { ...dati, stato: 'bozza' });
    await setDoc(doc(db, 'edizioni/annunciata'), { ...dati, stato: 'annunciata' });
    await setDoc(doc(db, 'edizioni/conclusa'), { ...dati, stato: 'conclusa' });
    await setDoc(doc(db, 'edizioni/annullata'), { ...dati, stato: 'annullata' });
    await setDoc(doc(db, 'impostazioni/pagamenti'), {
      paypal: '',
      satispay: '',
      aggiornato: CREATO,
    });
  });
});
afterAll(async () => {
  await ambiente.cleanup();
});

const admin = () =>
  ambiente.authenticatedContext('arturo', { email_verified: true, admin: true }).firestore();
const approvato = () =>
  ambiente.authenticatedContext('giulia', { email_verified: true, approvato: true }).firestore();
const inAttesa = () => ambiente.authenticatedContext('dino', { email_verified: true }).firestore();
const anonimo = () => ambiente.unauthenticatedContext().firestore();

/** Un'edizione valida come la scrive il modulo; `aggiornato` è sempre il momento della scrittura. */
const edizione = (stato = 'bozza', extra: object = {}) => ({
  nome: 'Primavera 2027',
  quando: { tipo: 'data', data: '2027-05-22' },
  tema: 'pizzaparty-2026',
  quota: { singolo: 5, conAccompagnatore: 10 },
  pagamenti: { paypal: true, satispay: false, contanti: true },
  stato,
  creato: serverTimestamp(),
  aggiornato: serverTimestamp(),
  ...extra,
});

describe('edizioni: lettura', () => {
  it("l'admin le legge tutte, bozze comprese", async () => {
    await assertSucceeds(getDoc(doc(admin(), 'edizioni/bozza')));
    await assertSucceeds(getDocs(collection(admin(), 'edizioni')));
  });

  it('un approvato legge solo annunciate, concluse e annullate', async () => {
    await assertSucceeds(getDoc(doc(approvato(), 'edizioni/annunciata')));
    await assertSucceeds(getDoc(doc(approvato(), 'edizioni/conclusa')));
    await assertSucceeds(getDoc(doc(approvato(), 'edizioni/annullata')));
    await assertFails(getDoc(doc(approvato(), 'edizioni/bozza')));
  });

  it('un elenco che include le bozze non si apre a un approvato', async () => {
    await assertFails(getDocs(collection(approvato(), 'edizioni')));
  });

  it('chi è in attesa o non ha fatto accesso non legge nulla', async () => {
    await assertFails(getDoc(doc(inAttesa(), 'edizioni/annunciata')));
    await assertFails(getDoc(doc(anonimo(), 'edizioni/annunciata')));
    await assertFails(getDocs(collection(anonimo(), 'edizioni')));
  });
});

describe('edizioni: scrittura', () => {
  it("l'admin crea un'edizione valida", async () => {
    await assertSucceeds(setDoc(doc(admin(), 'edizioni/nuova'), edizione()));
  });

  it("l'admin la modifica e la annulla, con creato invariato", async () => {
    await assertSucceeds(
      setDoc(doc(admin(), 'edizioni/annunciata'), edizione('annullata', { creato: CREATO })),
    );
  });

  it('una modifica che cambia la data di creazione viene rifiutata', async () => {
    await assertFails(
      setDoc(
        doc(admin(), 'edizioni/annunciata'),
        edizione('annunciata', { creato: serverTimestamp() }),
      ),
    );
  });

  it('un approvato non scrive, né crea né modifica', async () => {
    await assertFails(setDoc(doc(approvato(), 'edizioni/nuova'), edizione('annunciata')));
    await assertFails(
      setDoc(doc(approvato(), 'edizioni/annunciata'), edizione('annullata', { creato: CREATO })),
    );
  });

  it('nessuno cancella, nemmeno l’admin', async () => {
    await assertFails(deleteDoc(doc(admin(), 'edizioni/bozza')));
    await assertFails(deleteDoc(doc(approvato(), 'edizioni/annunciata')));
  });

  it('rifiuta i dati non validi', async () => {
    const rifiutati: Record<string, object> = {
      'chiave in più': { extra: 'x' },
      'quota 101': { quota: { singolo: 101, conAccompagnatore: 10 } },
      'quota decimale': { quota: { singolo: 5.5, conAccompagnatore: 10 } },
      'data malformata': { quando: { tipo: 'data', data: '22/05/2027' } },
      'periodo troppo corto': { quando: { tipo: 'periodo', periodo: 'M' } },
      'stato sconosciuto': { stato: 'pubblicata' },
      'nome con spazi ai bordi': { nome: ' Primavera 2027 ' },
      'pagamento non booleano': { pagamenti: { paypal: 'sì', satispay: false, contanti: true } },
      'tema con spazi': { tema: 'pizzaparty 2026' },
      'aggiornato non è il momento della scrittura': { aggiornato: CREATO },
    };
    let indice = 0;
    for (const modifiche of Object.values(rifiutati)) {
      indice++;
      await assertFails(
        setDoc(doc(admin(), `edizioni/prova-${indice}`), edizione('bozza', modifiche)),
      );
    }
  });
});

describe('link di pagamento (impostazioni/pagamenti)', () => {
  const link = (paypal: string, satispay = '') => ({
    paypal,
    satispay,
    aggiornato: serverTimestamp(),
  });

  it("solo l'admin li legge e li salva", async () => {
    await assertSucceeds(getDoc(doc(admin(), 'impostazioni/pagamenti')));
    await assertSucceeds(
      setDoc(doc(admin(), 'impostazioni/pagamenti'), link('https://pagamenti.example.test/pp')),
    );
  });

  it('nessun altro li legge o li scrive', async () => {
    await assertFails(getDoc(doc(approvato(), 'impostazioni/pagamenti')));
    await assertFails(getDoc(doc(anonimo(), 'impostazioni/pagamenti')));
    await assertFails(
      setDoc(doc(approvato(), 'impostazioni/pagamenti'), link('https://pagamenti.example.test/pp')),
    );
  });

  it('il link deve essere vuoto oppure iniziare con https://', async () => {
    await assertSucceeds(
      setDoc(doc(admin(), 'impostazioni/pagamenti'), link('', 'https://pagamenti.example.test/s')),
    );
    await assertFails(
      setDoc(doc(admin(), 'impostazioni/pagamenti'), link('http://pagamenti.example.test/pp')),
    );
  });

  it('non si cancella e non si apre nessun altro documento in impostazioni/', async () => {
    await assertFails(deleteDoc(doc(admin(), 'impostazioni/pagamenti')));
    await assertFails(getDoc(doc(admin(), 'impostazioni/altro')));
  });
});
