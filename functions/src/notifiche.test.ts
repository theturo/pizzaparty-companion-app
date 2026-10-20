import { describe, expect, it, vi } from 'vitest';

vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase-admin/auth', () => ({ getAuth: vi.fn() }));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: vi.fn() }));
vi.mock('firebase-admin/messaging', () => ({ getMessaging: vi.fn() }));

const { componiMessaggio } = await import('./notifiche.js');

describe('messaggio delle notifiche', () => {
  it('è "solo dati", urgente e valido un giorno', () => {
    const messaggio = componiMessaggio(
      { titolo: 'Sei dentro!', testo: 'Approvato', link: '/profilo' },
      ['codice-1', 'codice-2'],
    );
    expect(messaggio.tokens).toEqual(['codice-1', 'codice-2']);
    expect(messaggio.data).toEqual({ titolo: 'Sei dentro!', testo: 'Approvato', link: '/profilo' });
    expect(messaggio).not.toHaveProperty('notification');
    expect(messaggio.webpush.headers).toEqual({ Urgency: 'high', TTL: '86400' });
  });
});
