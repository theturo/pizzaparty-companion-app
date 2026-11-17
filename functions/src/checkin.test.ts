import { describe, expect, it, vi } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';

// Il modulo inizializza Firebase Admin: in questi test non serve un progetto vero.
vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase-admin/auth', () => ({ getAuth: vi.fn() }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
  FieldValue: { serverTimestamp: vi.fn() },
}));

const {
  finestraCheckin,
  eAperto,
  controllaAccesso,
  controllaEdizione,
  decidiPresenza,
  orariDi,
  oraRoma,
  istanteRoma,
  viaDi,
  controllaOspite,
  nomeOspite,
  normalizzaNome,
} = await import('./checkin.js');

const errore = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e as HttpsError;
  }
  throw new Error('doveva lanciare un errore');
};

describe('finestra del check-in (ora di Roma)', () => {
  it('apre 30 minuti prima dell’inizio e chiude alle 03:00 del giorno dopo', () => {
    // Ora solare: Roma è UTC+1.
    const { apertura, chiusura } = finestraCheckin('2026-12-19', '19:30');
    expect(apertura.toISOString()).toBe('2026-12-19T18:00:00.000Z');
    expect(chiusura.toISOString()).toBe('2026-12-20T02:00:00.000Z');
  });

  it('il giorno del cambio d’ora solare (25/10/2026) resta corretto', () => {
    const { apertura, chiusura } = finestraCheckin('2026-10-25', '19:30');
    // Il 25/10/2026 l'ora legale finisce alle 03:00: alle 19:00 siamo già in ora solare (UTC+1).
    expect(apertura.toISOString()).toBe('2026-10-25T18:00:00.000Z');
    expect(chiusura.toISOString()).toBe('2026-10-26T02:00:00.000Z');
  });

  it('il giorno del passaggio all’ora legale (28/03/2027) resta corretto', () => {
    const { apertura, chiusura } = finestraCheckin('2027-03-28', '19:30');
    expect(apertura.toISOString()).toBe('2027-03-28T17:00:00.000Z');
    expect(chiusura.toISOString()).toBe('2027-03-29T01:00:00.000Z');
  });

  it('un inizio a mezzanotte apre la sera prima', () => {
    const { apertura } = finestraCheckin('2026-10-25', '00:00');
    expect(apertura.toISOString()).toBe('2026-10-24T21:30:00.000Z');
  });

  it('istanteRoma conta le ore a muro, anche oltre 24 ore', () => {
    expect(istanteRoma('2027-03-28', 27 * 60).toISOString()).toBe('2027-03-29T01:00:00.000Z');
  });

  it('oraRoma stampa l’ora di Roma', () => {
    expect(oraRoma(new Date('2026-12-19T17:00:00.000Z'))).toBe('18:00');
    expect(oraRoma(new Date('2026-07-01T17:00:00.000Z'))).toBe('19:00');
  });
});

describe('orari dell’edizione', () => {
  it('quelli mancanti valgono 19:30 e 23:30', () => {
    expect(orariDi({})).toEqual({ inizio: '19:30', fine: '23:30' });
    expect(orariDi({ inizio: '20:00' })).toEqual({ inizio: '20:00', fine: '23:30' });
  });
});

describe('eAperto', () => {
  const edizione = {
    nome: 'Festa',
    stato: 'annunciata',
    quando: { tipo: 'data', data: '2026-12-19' },
  };

  it('è aperto dentro la finestra, chiuso fuori', () => {
    expect(eAperto(edizione, new Date('2026-12-19T17:59:00.000Z'))).toBe(false);
    expect(eAperto(edizione, new Date('2026-12-19T18:00:00.000Z'))).toBe(true);
    expect(eAperto(edizione, new Date('2026-12-20T01:59:00.000Z'))).toBe(true);
    expect(eAperto(edizione, new Date('2026-12-20T02:00:00.000Z'))).toBe(false);
  });

  it('non è aperto se non è annunciata o se il periodo non ha un giorno', () => {
    const adesso = new Date('2026-12-19T18:00:00.000Z');
    expect(eAperto({ ...edizione, stato: 'bozza' }, adesso)).toBe(false);
    expect(eAperto({ ...edizione, quando: { tipo: 'periodo', periodo: 'Dicembre' } }, adesso)).toBe(
      false,
    );
  });
});

describe('controllo dell’accesso', () => {
  it('senza accesso: "Accedi per registrare la presenza."', () => {
    const e = errore(() => controllaAccesso(null));
    expect(e.code).toBe('unauthenticated');
    expect(e.message).toBe('Accedi per registrare la presenza.');
  });

  it('account non approvato: "Il check-in è per gli account approvati."', () => {
    const e = errore(() => controllaAccesso({ uid: 'dino', token: {} }));
    expect(e.message).toBe('Il check-in è per gli account approvati.');
  });

  it('approvati e admin passano e restituiscono l’uid', () => {
    expect(controllaAccesso({ uid: 'giulia', token: { approvato: true } })).toBe('giulia');
    expect(controllaAccesso({ uid: 'arturo', token: { admin: true } })).toBe('arturo');
  });
});

describe('controllo dell’edizione', () => {
  const adesso = new Date('2026-12-19T18:00:00.000Z');
  const aperta = {
    nome: 'Festa',
    stato: 'annunciata',
    quando: { tipo: 'data', data: '2026-12-19' },
  };

  it('QR sconosciuto, bozza o periodo: "Questo QR non è valido."', () => {
    const messaggio = 'Questo QR non è valido.';
    expect(errore(() => controllaEdizione(undefined, adesso)).message).toBe(messaggio);
    expect(errore(() => controllaEdizione({ ...aperta, stato: 'bozza' }, adesso)).message).toBe(
      messaggio,
    );
    expect(
      errore(() =>
        controllaEdizione({ ...aperta, quando: { tipo: 'periodo', periodo: 'Dicembre' } }, adesso),
      ).message,
    ).toBe(messaggio);
  });

  it('fuori finestra: il messaggio dà l’ora di apertura', () => {
    const prima = new Date('2026-12-19T10:00:00.000Z');
    const e = errore(() => controllaEdizione(aperta, prima));
    expect(e.code).toBe('failed-precondition');
    expect(e.message).toBe(
      'Il check-in è aperto dalle 19:00 del giorno della festa alle 03:00 della notte.',
    );
    expect(() => controllaEdizione(aperta, new Date('2026-12-20T03:00:00.000Z'))).toThrow();
  });

  it('dentro la finestra non lancia', () => {
    expect(() => controllaEdizione(aperta, adesso)).not.toThrow();
  });
});

describe('decisione sulla presenza', () => {
  const adesso = new Date('2026-12-19T18:00:00.000Z');

  it('la prima volta scrive e risponde "registrata"', () => {
    expect(decidiPresenza(undefined, adesso)).toEqual({
      esito: 'registrata',
      registrata: adesso,
      scrivi: true,
    });
  });

  it('se c’è già non scrive e restituisce l’ora della prima volta', () => {
    const prima = new Date('2026-12-19T17:30:00.000Z');
    expect(decidiPresenza({ registrata: prima }, adesso)).toEqual({
      esito: 'gia-presente',
      registrata: prima,
      scrivi: false,
    });
  });
});

describe('da dove arriva la presenza (D-064)', () => {
  it("'scanner' resta 'scanner'; il link e tutto il resto valgono 'link'", () => {
    expect(viaDi('scanner')).toBe('scanner');
    expect(viaDi('link')).toBe('link');
    expect(viaDi(undefined)).toBe('link');
    expect(viaDi(null)).toBe('link');
    expect(viaDi('Scanner')).toBe('link');
    expect(viaDi('qualcosa')).toBe('link');
    expect(viaDi(1)).toBe('link');
  });
});

describe('chi entra come ospite (D-065)', () => {
  const anonimo = { uid: 'ospite1', token: { firebase: { sign_in_provider: 'anonymous' } } };
  const conPassword = { uid: 'giulia', token: { firebase: { sign_in_provider: 'password' } } };

  it('senza accesso: "Entra come ospite per registrare la presenza."', () => {
    const e = errore(() => controllaOspite(null));
    expect(e.code).toBe('unauthenticated');
    expect(e.message).toBe('Entra come ospite per registrare la presenza.');
  });

  it("con l'accesso anonimo passa e restituisce l'uid", () => {
    expect(controllaOspite(anonimo)).toBe('ospite1');
  });

  it('chi ha un account (o un token senza fornitore) deve usare Accedi', () => {
    const e = errore(() => controllaOspite(conPassword));
    expect(e.code).toBe('failed-precondition');
    expect(e.message).toBe('Hai già un account: usa Accedi.');
    expect(errore(() => controllaOspite({ uid: 'x', token: {} })).code).toBe('failed-precondition');
  });
});

describe('nome dell’ospite (D-067)', () => {
  it('toglie gli spazi ai bordi e riduce quelli in mezzo a uno', () => {
    expect(nomeOspite('  Anna   Maria  ')).toBe('Anna Maria');
    expect(nomeOspite('Gigi\t\tRossi')).toBe('Gigi Rossi');
  });

  it('accetta da 2 a 40 caratteri, estremi inclusi', () => {
    expect(nomeOspite('Al')).toBe('Al');
    expect(nomeOspite('a'.repeat(40))).toBe('a'.repeat(40));
  });

  it('rifiuta un nome corto, lungo o non testuale, con il messaggio per la persona', () => {
    for (const valore of ['', ' a ', 'a'.repeat(41), undefined, 42, null]) {
      const e = errore(() => nomeOspite(valore));
      expect(e.code).toBe('invalid-argument');
      expect(e.message).toBe('Scrivi un nome tra 2 e 40 caratteri.');
    }
  });

  it('il confronto ignora maiuscole, accenti e spazi doppi', () => {
    expect(normalizzaNome('  Èlena   Ferrò ')).toBe('elena ferro');
    expect(normalizzaNome('ELENA FERRO')).toBe('elena ferro');
    expect(normalizzaNome('Gigi Rossi')).not.toBe(normalizzaNome('Gigi Rosso'));
  });
});
