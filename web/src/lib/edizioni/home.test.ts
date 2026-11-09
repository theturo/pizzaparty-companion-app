import { describe, expect, it } from 'vitest';
import type { Edizione, StatoEdizione } from './edizione';
import {
  maiuscola,
  puoEssereInHome,
  scegliEdizioneHome,
  tempoMancante,
  testoMancante,
} from './home';

const edizione = (
  nome: string,
  stato: StatoEdizione,
  creato: unknown,
  periodo = 'Maggio 2027',
): Edizione => ({
  nome,
  quando: { tipo: 'periodo', periodo },
  tema: 'pizzaparty-2026',
  quota: { singolo: 5, conAccompagnatore: 10 },
  pagamenti: { paypal: true, satispay: true, contanti: true },
  stato,
  creato,
  aggiornato: creato,
});

/** Un Timestamp di Firestore, ridotto a quello che serve al codice: toMillis(). */
const timestamp = (millis: number) => ({ toMillis: () => millis });

describe('scegliEdizioneHome', () => {
  it('non ha edizioni da mostrare: null', () => {
    expect(scegliEdizioneHome([])).toBeNull();
  });

  it('ignora bozze e edizioni concluse', () => {
    const edizioni = [
      edizione('Bozza', 'bozza', timestamp(3)),
      edizione('Conclusa', 'conclusa', timestamp(2)),
    ];
    expect(scegliEdizioneHome(edizioni)).toBeNull();
  });

  it('prende la più recente per creato tra annunciate e annullate', () => {
    const edizioni = [
      edizione('Vecchia', 'annunciata', timestamp(1000)),
      edizione('Nuova', 'annullata', timestamp(3000)),
      edizione('Media', 'annunciata', timestamp(2000)),
      edizione('Bozza più recente', 'bozza', timestamp(9000)),
    ];
    expect(scegliEdizioneHome(edizioni)?.nome).toBe('Nuova');
  });

  it('a parità di creato vince la prima della lista', () => {
    const edizioni = [
      edizione('Prima', 'annunciata', timestamp(5000)),
      edizione('Seconda', 'annunciata', timestamp(5000)),
    ];
    expect(scegliEdizioneHome(edizioni)?.nome).toBe('Prima');
  });

  it('senza creato la più recente è quella con la data; tra quelle senza, la prima', () => {
    const conData = [
      edizione('Senza data', 'annunciata', undefined),
      edizione('Con data', 'annunciata', timestamp(1)),
    ];
    expect(scegliEdizioneHome(conData)?.nome).toBe('Con data');

    const senzaData = [
      edizione('Prima senza', 'annunciata', null),
      edizione('Seconda senza', 'annunciata', undefined),
    ];
    expect(scegliEdizioneHome(senzaData)?.nome).toBe('Prima senza');
  });

  it('accetta anche il creato come numero di millisecondi', () => {
    const edizioni = [edizione('Piccola', 'annunciata', 10), edizione('Grande', 'annunciata', 20)];
    expect(scegliEdizioneHome(edizioni)?.nome).toBe('Grande');
  });

  it('puoEssereInHome riconosce solo annunciate e annullate', () => {
    expect(puoEssereInHome(edizione('a', 'annunciata', null))).toBe(true);
    expect(puoEssereInHome(edizione('a', 'annullata', null))).toBe(true);
    expect(puoEssereInHome(edizione('a', 'bozza', null))).toBe(false);
    expect(puoEssereInHome(edizione('a', 'conclusa', null))).toBe(false);
  });
});

describe('tempoMancante', () => {
  it('conta dall’orologio fino alla mezzanotte del giorno', () => {
    // 2027-05-20 alle 12:00 → 2027-05-22 alle 00:00: un giorno e dodici ore.
    const adesso = new Date(2027, 4, 20, 12, 0, 0);
    expect(tempoMancante('2027-05-22', adesso)).toEqual({ giorni: 1, ore: 12, minuti: 0 });
  });

  it('i giorni grandi restano esatti (195 giorni, 3 ore e 12 minuti)', () => {
    const adesso = new Date(2026, 10, 7, 20, 48, 0);
    expect(tempoMancante('2027-05-22', adesso)).toEqual({ giorni: 195, ore: 3, minuti: 12 });
  });

  it('un minuto appena iniziato non conta come passato', () => {
    // Alle 23:59:30 manca mezzo minuto: il conto dà 0 minuti, non un minuto in più.
    const adesso = new Date(2027, 4, 21, 23, 59, 30);
    expect(tempoMancante('2027-05-22', adesso)).toEqual({ giorni: 0, ore: 0, minuti: 0 });
    const inizioDelGiorno = new Date(2027, 4, 21, 0, 0, 30);
    expect(tempoMancante('2027-05-22', inizioDelGiorno)).toEqual({
      giorni: 0,
      ore: 23,
      minuti: 59,
    });
  });

  it('il cambio dell’ora legale (28 marzo 2027) non sposta il conto di un’ora', () => {
    // Il 28 marzo le ore sono 23: il conto resta sull’orologio da muro.
    expect(tempoMancante('2027-03-29', new Date(2027, 2, 27, 12, 0, 0))).toEqual({
      giorni: 1,
      ore: 12,
      minuti: 0,
    });
    expect(tempoMancante('2027-03-29', new Date(2027, 2, 28, 0, 0, 0))).toEqual({
      giorni: 1,
      ore: 0,
      minuti: 0,
    });
    expect(tempoMancante('2027-03-29', new Date(2027, 2, 28, 12, 0, 0))).toEqual({
      giorni: 0,
      ore: 12,
      minuti: 0,
    });
  });

  it("'oggi' se la data è il giorno corrente, a qualunque ora", () => {
    expect(tempoMancante('2027-05-22', new Date(2027, 4, 22, 0, 0, 0))).toBe('oggi');
    expect(tempoMancante('2027-05-22', new Date(2027, 4, 22, 23, 59, 59))).toBe('oggi');
  });

  it("'passata' se il giorno è finito", () => {
    expect(tempoMancante('2027-05-22', new Date(2027, 4, 23, 0, 0, 0))).toBe('passata');
    expect(tempoMancante('2027-05-22', new Date(2028, 0, 1))).toBe('passata');
  });
});

describe('testoMancante', () => {
  it('usa il plurale per tutte le unità diverse da 1', () => {
    expect(testoMancante({ giorni: 195, ore: 3, minuti: 12 })).toBe(
      'Mancano 195 giorni, 3 ore e 12 minuti',
    );
  });

  it('usa il singolare, e "Manca" quando i giorni sono uno', () => {
    expect(testoMancante({ giorni: 1, ore: 1, minuti: 1 })).toBe(
      'Manca 1 giorno, 1 ora e 1 minuto',
    );
  });

  it('il plurale vale anche per zero', () => {
    expect(testoMancante({ giorni: 0, ore: 0, minuti: 0 })).toBe(
      'Mancano 0 giorni, 0 ore e 0 minuti',
    );
  });

  it('con un solo giorno ma più minuti: "Manca" e plurali per il resto', () => {
    expect(testoMancante({ giorni: 1, ore: 12, minuti: 0 })).toBe(
      'Manca 1 giorno, 12 ore e 0 minuti',
    );
  });
});

describe('maiuscola', () => {
  it("porta a maiuscola la prima lettera e lascia il resto com'è", () => {
    expect(maiuscola('sabato 22 maggio 2027')).toBe('Sabato 22 maggio 2027');
    expect(maiuscola('')).toBe('');
  });
});
