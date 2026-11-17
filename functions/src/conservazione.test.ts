import { describe, expect, it } from 'vitest';
import {
  richiestaScaduta,
  accountInattivo,
  anonimoDaCancellare,
  segnapostoDaCancellare,
} from './conservazione.js';

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

describe('account anonimi degli ospiti (D-065)', () => {
  const giorni = (n: number) => new Date(adesso.getTime() - n * 24 * 60 * 60 * 1000);

  it('si cancellano dopo 30 giorni, se non hanno email né fornitori', () => {
    expect(anonimoDaCancellare({ providerData: [], creato: giorni(29) }, adesso)).toBe(false);
    expect(anonimoDaCancellare({ providerData: [], creato: giorni(31) }, adesso)).toBe(true);
  });

  it('un account con email o con un fornitore non è mai anonimo', () => {
    const vecchio = giorni(400);
    expect(
      anonimoDaCancellare({ providerData: [], email: 'utente-di-prova', creato: vecchio }, adesso),
    ).toBe(false);
    expect(
      anonimoDaCancellare({ providerData: [{ providerId: 'password' }], creato: vecchio }, adesso),
    ).toBe(false);
  });
});

describe('segnaposto degli ospiti (D-061)', () => {
  it('si cancellano dopo 3 anni, se origine ospite e non collegati a un account', () => {
    const tre = new Date('2023-05-15T12:00:00Z');
    expect(
      segnapostoDaCancellare({ origine: 'ospite', creato: new Date('2024-06-01') }, adesso),
    ).toBe(false);
    expect(
      segnapostoDaCancellare({ origine: 'ospite', creato: new Date('2024-05-01') }, adesso),
    ).toBe(true);
    expect(segnapostoDaCancellare({ origine: 'ospite', creato: tre }, adesso)).toBe(true);
  });

  it('un segnaposto collegato a un account, o di altra origine, resta', () => {
    const tanto = new Date('2020-01-01T00:00:00Z');
    expect(
      segnapostoDaCancellare({ origine: 'ospite', collegatoA: 'uid1', creato: tanto }, adesso),
    ).toBe(false);
    expect(segnapostoDaCancellare({ origine: 'storico', creato: tanto }, adesso)).toBe(false);
  });
});
