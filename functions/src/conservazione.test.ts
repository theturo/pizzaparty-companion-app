import { describe, expect, it } from 'vitest';
import { richiestaScaduta, accountInattivo } from './conservazione.js';

const adesso = new Date('2027-05-15T12:00:00Z');

describe('richieste mai approvate', () => {
  it('restano fino a 60 giorni, poi scadono', () => {
    expect(richiestaScaduta(new Date('2027-03-20T12:00:00Z'), adesso)).toBe(false); // 56 giorni
    expect(richiestaScaduta(new Date('2027-03-10T12:00:00Z'), adesso)).toBe(true); // 66 giorni
  });
});

describe('account inattivi', () => {
  it('si cancellano dopo 3 anni senza attività', () => {
    expect(accountInattivo(new Date('2024-06-01T00:00:00Z'), adesso, false)).toBe(false);
    expect(accountInattivo(new Date('2024-05-01T00:00:00Z'), adesso, false)).toBe(true);
  });

  it('gli admin non si cancellano mai da soli', () => {
    expect(accountInattivo(new Date('2020-01-01T00:00:00Z'), adesso, true)).toBe(false);
  });
});
