import { describe, expect, it, vi } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';

// Il modulo inizializza Firebase Admin: in questi test non serve un progetto vero.
vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase-admin/auth', () => ({ getAuth: vi.fn() }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
  FieldValue: { serverTimestamp: vi.fn() },
}));

const { sceltaPersona, accettaPresenze, pianoCollegamento } = await import('./presenze.js');

const errore = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e as HttpsError;
  }
  throw new Error('doveva lanciare un errore');
};

describe('scelta della persona: un solo tipo', () => {
  it('accetta un account', () => {
    expect(sceltaPersona({ uid: 'giulia42' })).toEqual({ uid: 'giulia42' });
  });

  it('accetta un segnaposto', () => {
    expect(sceltaPersona({ segnaposto: 'abc_123-XYZ' })).toEqual({ segnaposto: 'abc_123-XYZ' });
  });

  it('rifiuta sia uid sia segnaposto', () => {
    const e = errore(() => sceltaPersona({ uid: 'giulia42', segnaposto: 'abc' }));
    expect(e.code).toBe('invalid-argument');
  });

  it('rifiuta nessuno dei due', () => {
    expect(errore(() => sceltaPersona({})).code).toBe('invalid-argument');
    expect(errore(() => sceltaPersona({ uid: null, segnaposto: null })).code).toBe(
      'invalid-argument',
    );
  });

  it('rifiuta id con caratteri strani o troppo lunghi', () => {
    expect(errore(() => sceltaPersona({ segnaposto: 'a/b' })).code).toBe('invalid-argument');
    expect(errore(() => sceltaPersona({ segnaposto: '' })).code).toBe('invalid-argument');
    expect(errore(() => sceltaPersona({ uid: 'con spazi' })).code).toBe('invalid-argument');
    expect(errore(() => sceltaPersona({ segnaposto: 'x'.repeat(129) })).code).toBe(
      'invalid-argument',
    );
  });
});

describe('edizione per le presenze a mano', () => {
  const data = { nome: 'Festa', stato: 'conclusa', quando: { tipo: 'data', data: '2026-06-01' } };

  it('accetta un’edizione conclusa o annunciata con data, anche fuori dalla finestra oraria', () => {
    expect(() => accettaPresenze(data)).not.toThrow();
    expect(() => accettaPresenze({ ...data, stato: 'annunciata' })).not.toThrow();
  });

  it('rifiuta un’edizione che non esiste', () => {
    expect(errore(() => accettaPresenze(undefined)).code).toBe('not-found');
  });

  it('rifiuta bozze, annullate e edizioni senza data esatta', () => {
    expect(errore(() => accettaPresenze({ ...data, stato: 'bozza' })).code).toBe(
      'failed-precondition',
    );
    expect(errore(() => accettaPresenze({ ...data, stato: 'annullata' })).code).toBe(
      'failed-precondition',
    );
    const periodo = { ...data, quando: { tipo: 'periodo', periodo: 'estate' } };
    expect(errore(() => accettaPresenze(periodo)).code).toBe('failed-precondition');
  });
});

describe('collegamento di un segnaposto: cosa spostare e cosa scartare', () => {
  const p = (edizione: string, istante: number, via = 'link') => ({
    edizione,
    registrata: `ora-${istante}`,
    istante,
    via,
  });

  it('sposta le presenze nelle edizioni in cui l’account non c’è, e scarta le altre', () => {
    const presenze = [
      p('festa-2024', 1, 'manuale'),
      p('festa-2025', 2),
      p('festa-2026', 3, 'scanner'),
    ];
    const piano = pianoCollegamento(presenze, new Set(['festa-2025']));
    expect(piano.spostare.map((x) => x.edizione)).toEqual(['festa-2024', 'festa-2026']);
    expect(piano.giaPresenti.map((x) => x.edizione)).toEqual(['festa-2025']);
    expect(piano.duplicate).toEqual([]);
  });

  it('copia la data e la modalità originali, senza cambiarle', () => {
    const piano = pianoCollegamento([p('festa-2024', 1, 'manuale')], new Set());
    expect(piano.spostare).toEqual([
      { edizione: 'festa-2024', registrata: 'ora-1', istante: 1, via: 'manuale' },
    ]);
    expect(piano.giaPresenti).toEqual([]);
  });

  it('un segnaposto senza presenze non sposta nulla', () => {
    const piano = pianoCollegamento([], new Set(['festa-2025']));
    expect(piano).toEqual({ spostare: [], giaPresenti: [], duplicate: [] });
  });

  it('se l’account è già presente ovunque, non sposta niente ma conta tutto come già presente', () => {
    const piano = pianoCollegamento([p('festa-2025', 1)], new Set(['festa-2025']));
    expect(piano.spostare).toEqual([]);
    expect(piano.giaPresenti).toHaveLength(1);
  });

  it('più presenze nella stessa edizione: si tiene la più vecchia, le altre sono duplicati', () => {
    const presenze = [p('festa-2025', 30), p('festa-2025', 10, 'scanner'), p('festa-2025', 20)];
    const piano = pianoCollegamento(presenze, new Set());
    expect(piano.spostare).toEqual([
      { edizione: 'festa-2025', registrata: 'ora-10', istante: 10, via: 'scanner' },
    ]);
    expect(piano.duplicate.map((x) => x.istante)).toEqual([20, 30]);
  });

  it('un duplicato in un’edizione dove l’account è già presente non si conta come già presente', () => {
    const presenze = [p('festa-2025', 1), p('festa-2025', 2)];
    const piano = pianoCollegamento(presenze, new Set(['festa-2025']));
    expect(piano.giaPresenti).toHaveLength(1);
    expect(piano.duplicate).toHaveLength(1);
    expect(piano.spostare).toEqual([]);
  });
});
