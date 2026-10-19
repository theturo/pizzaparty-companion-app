import { describe, expect, it, vi } from 'vitest';

// Il modulo inizializza Firebase Admin: in questo test non serve un progetto vero.
vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase-admin/auth', () => ({ getAuth: vi.fn() }));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: vi.fn() }));

const { generaCodiceInvito, uidValido } = await import('./comune.js');

describe("codici d'invito", () => {
  it("hanno la forma xxxx-xxxx accettata dalle regole e dall'app", () => {
    for (let i = 0; i < 200; i++) {
      expect(generaCodiceInvito()).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}$/);
    }
  });

  it('non si ripetono', () => {
    const codici = new Set(Array.from({ length: 1000 }, generaCodiceInvito));
    expect(codici.size).toBe(1000);
  });
});

describe('controllo degli uid', () => {
  it('accetta un uid normale e rifiuta il resto', () => {
    expect(uidValido('abc123XYZ')).toBe('abc123XYZ');
    expect(() => uidValido('../utenti')).toThrow();
    expect(() => uidValido(42)).toThrow();
  });
});
