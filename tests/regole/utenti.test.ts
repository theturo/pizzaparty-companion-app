import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { creaAmbiente } from './ambiente';

let ambiente: RulesTestEnvironment;

beforeAll(async () => {
  ambiente = await creaAmbiente();
});
beforeEach(async () => {
  await ambiente.clearFirestore();
});
afterAll(async () => {
  await ambiente.cleanup();
});

/** Persona connessa, con l'email verificata dal link (D-024) se non indicato diversamente. */
const persona = (uid: string, emailVerificata = true) =>
  ambiente.authenticatedContext(uid, { email_verified: emailVerificata }).firestore();

/** Un profilo valido, come lo crea la pagina "Completa". */
const profiloValido = (modifiche: Record<string, unknown> = {}) => ({
  nome: 'Arturo',
  avatar: 'margherita',
  stato: 'in_attesa',
  invitatoDa: { codice: null, testo: 'Giulia' },
  accettazioni: {
    maggiorenne: true,
    condizioni: '2026-10-bozza',
    privacy: '2026-10-bozza',
    il: serverTimestamp(),
  },
  creato: serverTimestamp(),
  ...modifiche,
});

async function creaProfiloDiArturo() {
  await assertSucceeds(setDoc(doc(persona('arturo'), 'utenti/arturo'), profiloValido()));
}

describe('profili: creazione', () => {
  it('la persona crea il proprio profilo "in attesa"', async () => {
    await creaProfiloDiArturo();
  });

  it("va bene anche con un codice d'invito", async () => {
    await assertSucceeds(
      setDoc(
        doc(persona('arturo'), 'utenti/arturo'),
        profiloValido({ invitatoDa: { codice: 'giulia-1234', testo: null } }),
      ),
    );
  });

  it("serve aver verificato l'email", async () => {
    await assertFails(setDoc(doc(persona('arturo', false), 'utenti/arturo'), profiloValido()));
  });

  it('non si crea il profilo di qualcun altro', async () => {
    await assertFails(setDoc(doc(persona('intruso'), 'utenti/arturo'), profiloValido()));
  });

  it('chi non ha fatto accesso non crea nulla', async () => {
    const anonimo = ambiente.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(anonimo, 'utenti/arturo'), profiloValido()));
  });

  it('non ci si approva da soli', async () => {
    await assertFails(
      setDoc(doc(persona('arturo'), 'utenti/arturo'), profiloValido({ stato: 'approvato' })),
    );
  });

  it('niente campi in più', async () => {
    await assertFails(
      setDoc(doc(persona('arturo'), 'utenti/arturo'), profiloValido({ admin: true })),
    );
  });

  const nonValidi: [string, Record<string, unknown>][] = [
    ['nome troppo corto', { nome: 'A' }],
    ['nome troppo lungo', { nome: 'x'.repeat(41) }],
    ['nome con spazi ai lati', { nome: ' Arturo ' }],
    ['avatar inesistente', { avatar: 'ananas' }],
    ["codice d'invito strano", { invitatoDa: { codice: '<script>', testo: null } }],
    ['codice e testo insieme', { invitatoDa: { codice: 'giulia-1234', testo: 'Giulia' } }],
    ["testo d'invito troppo lungo", { invitatoDa: { codice: null, testo: 'x'.repeat(81) } }],
    [
      'maggiore età non dichiarata',
      {
        accettazioni: {
          maggiorenne: false,
          condizioni: '2026-10-bozza',
          privacy: '2026-10-bozza',
          il: serverTimestamp(),
        },
      },
    ],
    ['data di creazione inventata', { creato: new Date('2020-01-01') }],
  ];
  it.each(nonValidi)('rifiuta: %s', async (_, modifiche) => {
    await assertFails(setDoc(doc(persona('arturo'), 'utenti/arturo'), profiloValido(modifiche)));
  });
});

describe('profili: lettura', () => {
  it('ognuno legge il proprio profilo', async () => {
    await creaProfiloDiArturo();
    await assertSucceeds(getDoc(doc(persona('arturo'), 'utenti/arturo')));
  });

  it('per ora nessuno legge il profilo degli altri', async () => {
    await creaProfiloDiArturo();
    await assertFails(getDoc(doc(persona('giulia'), 'utenti/arturo')));
    await assertFails(getDoc(doc(ambiente.unauthenticatedContext().firestore(), 'utenti/arturo')));
  });
});

describe('profili: modifica e cancellazione', () => {
  it('si possono cambiare nome e avatar', async () => {
    await creaProfiloDiArturo();
    await assertSucceeds(
      updateDoc(doc(persona('arturo'), 'utenti/arturo'), { nome: 'Turo', avatar: 'forno' }),
    );
  });

  it('non si cambia il proprio stato', async () => {
    await creaProfiloDiArturo();
    await assertFails(updateDoc(doc(persona('arturo'), 'utenti/arturo'), { stato: 'approvato' }));
  });

  it('non si cambiano le accettazioni né chi ha invitato', async () => {
    await creaProfiloDiArturo();
    await assertFails(
      updateDoc(doc(persona('arturo'), 'utenti/arturo'), {
        invitatoDa: { codice: null, testo: 'Qualcun altro' },
      }),
    );
  });

  it('non si modifica il profilo di un altro', async () => {
    await creaProfiloDiArturo();
    await assertFails(updateDoc(doc(persona('giulia'), 'utenti/arturo'), { nome: 'Giulia' }));
  });

  it('il profilo non si cancella dal telefono', async () => {
    await creaProfiloDiArturo();
    await assertFails(deleteDoc(doc(persona('arturo'), 'utenti/arturo')));
  });
});
