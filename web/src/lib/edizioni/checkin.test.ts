import { describe, expect, it } from 'vitest';
import { eAperto, finestraCheckin, istanteRoma, oraRoma } from './checkin';
import { orariDi, validaEdizione, valoriIniziali, type DatiEdizione } from './edizione';

// Gli stessi casi di functions/src/checkin.test.ts: le due copie della logica devono dare lo stesso.

describe('finestra del check-in (ora di Roma)', () => {
  it('apre 30 minuti prima dell’inizio e chiude alle 03:00 del giorno dopo', () => {
    const { apertura, chiusura } = finestraCheckin('2026-12-19', '19:30');
    expect(apertura.toISOString()).toBe('2026-12-19T18:00:00.000Z');
    expect(chiusura.toISOString()).toBe('2026-12-20T02:00:00.000Z');
  });

  it('il giorno del cambio d’ora solare (25/10/2026) resta corretto', () => {
    const { apertura, chiusura } = finestraCheckin('2026-10-25', '19:30');
    expect(apertura.toISOString()).toBe('2026-10-25T18:00:00.000Z');
    expect(chiusura.toISOString()).toBe('2026-10-26T02:00:00.000Z');
  });

  it('il giorno del passaggio all’ora legale (28/03/2027) resta corretto', () => {
    const { apertura, chiusura } = finestraCheckin('2027-03-28', '19:30');
    expect(apertura.toISOString()).toBe('2027-03-28T17:00:00.000Z');
    expect(chiusura.toISOString()).toBe('2027-03-29T01:00:00.000Z');
  });

  it('un inizio a mezzanotte apre la sera prima', () => {
    expect(finestraCheckin('2026-10-25', '00:00').apertura.toISOString()).toBe(
      '2026-10-24T21:30:00.000Z',
    );
  });

  it('istanteRoma conta le ore a muro, anche oltre 24 ore', () => {
    expect(istanteRoma('2027-03-28', 27 * 60).toISOString()).toBe('2027-03-29T01:00:00.000Z');
  });

  it('oraRoma stampa l’ora di Roma, con l’ora legale', () => {
    expect(oraRoma(new Date('2026-12-19T18:00:00.000Z'))).toBe('19:00');
    expect(oraRoma(new Date('2026-07-01T17:00:00.000Z'))).toBe('19:00');
  });
});

describe('eAperto', () => {
  const edizione = { stato: 'annunciata', quando: { tipo: 'data' as const, data: '2026-12-19' } };

  it('è aperto dentro la finestra, chiuso fuori', () => {
    expect(eAperto(edizione, new Date('2026-12-19T17:59:00.000Z'))).toBe(false);
    expect(eAperto(edizione, new Date('2026-12-19T18:00:00.000Z'))).toBe(true);
    expect(eAperto(edizione, new Date('2026-12-20T01:59:00.000Z'))).toBe(true);
    expect(eAperto(edizione, new Date('2026-12-20T02:00:00.000Z'))).toBe(false);
  });

  it('non è aperto se non è annunciata o se il periodo non ha un giorno', () => {
    const adesso = new Date('2026-12-19T18:30:00.000Z');
    expect(eAperto({ ...edizione, stato: 'bozza' }, adesso)).toBe(false);
    expect(eAperto({ ...edizione, quando: { tipo: 'periodo', periodo: 'Dicembre' } }, adesso)).toBe(
      false,
    );
  });
});

describe('orari dell’edizione', () => {
  const datiConQuando = (quando: DatiEdizione['quando']): DatiEdizione => ({
    ...valoriIniziali('pizzaparty-2026'),
    nome: 'Festa',
    quando,
  });

  it('quelli mancanti valgono 19:30 e 23:30', () => {
    expect(orariDi({})).toEqual({ inizio: '19:30', fine: '23:30' });
    expect(orariDi({ inizio: '20:00' })).toEqual({ inizio: '20:00', fine: '23:30' });
  });

  it('accettano HH:MM, anche la fine dopo mezzanotte', () => {
    const dati = datiConQuando({
      tipo: 'data',
      data: '2027-05-22',
      inizio: '19:30',
      fine: '00:15',
    });
    expect(validaEdizione(dati)).toEqual([]);
  });

  it('rifiutano orari fuori formato, con il campo "orario"', () => {
    for (const orario of ['24:00', '7:30', '19.30', '19:60']) {
      const errori = validaEdizione(
        datiConQuando({ tipo: 'data', data: '2027-05-22', inizio: orario, fine: '23:30' }),
      );
      expect(errori.map((e) => e.campo)).toEqual(['orario']);
    }
  });
});
