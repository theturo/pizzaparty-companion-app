import { describe, expect, it } from 'vitest';
import {
  descriviQuando,
  eDataValida,
  ETICHETTE_STATO,
  validaEdizione,
  validaLink,
  valoriIniziali,
  type DatiEdizione,
} from './edizione';

const base = (): DatiEdizione => ({
  ...valoriIniziali('pizzaparty-2026'),
  nome: 'Primavera 2027',
  quando: { tipo: 'periodo', periodo: 'Maggio 2027' },
});

describe('validaEdizione', () => {
  it('accetta un’edizione completa', () => {
    expect(validaEdizione(base())).toEqual([]);
  });

  it('chiede un nome di almeno 2 caratteri', () => {
    const errori = validaEdizione({ ...base(), nome: 'A' });
    expect(errori).toEqual([{ campo: 'nome', messaggio: 'Scrivi un nome di almeno 2 caratteri.' }]);
  });

  it('rifiuta un nome più lungo del limite', () => {
    const errori = validaEdizione({ ...base(), nome: 'x'.repeat(61) });
    expect(errori.map((e) => e.campo)).toEqual(['nome']);
  });

  it('per la data esatta chiede il giorno, e rifiuta le date che non esistono', () => {
    const vuota = validaEdizione({ ...base(), quando: { tipo: 'data', data: '' } });
    expect(vuota).toEqual([{ campo: 'giorno', messaggio: 'Scegli il giorno.' }]);
    const inesistente = validaEdizione({
      ...base(),
      quando: { tipo: 'data', data: '2027-02-30' },
    });
    expect(inesistente).toEqual([{ campo: 'giorno', messaggio: 'Scegli il giorno.' }]);
  });

  it('per il periodo chiede almeno due caratteri', () => {
    const errori = validaEdizione({ ...base(), quando: { tipo: 'periodo', periodo: ' ' } });
    expect(errori).toEqual([
      { campo: 'periodo', messaggio: 'Scrivi il periodo, per esempio Maggio 2027.' },
    ]);
  });

  it('accetta solo quote intere da 0 a 100', () => {
    const messaggio = 'La quota è un numero intero da 0 a 100.';
    for (const quota of [
      { singolo: 101, conAccompagnatore: 10 },
      { singolo: 5.5, conAccompagnatore: 10 },
      { singolo: 5, conAccompagnatore: -1 },
      { singolo: NaN, conAccompagnatore: 10 },
    ]) {
      expect(validaEdizione({ ...base(), quota })).toEqual([{ campo: 'quota', messaggio }]);
    }
    expect(validaEdizione({ ...base(), quota: { singolo: 0, conAccompagnatore: 100 } })).toEqual(
      [],
    );
  });
});

describe('eDataValida', () => {
  it('accetta solo AAAA-MM-GG reali', () => {
    expect(eDataValida('2027-05-22')).toBe(true);
    expect(eDataValida('2028-02-29')).toBe(true);
    expect(eDataValida('2027-02-29')).toBe(false);
    expect(eDataValida('22/05/2027')).toBe(false);
    expect(eDataValida('2027-5-22')).toBe(false);
  });
});

describe('descriviQuando', () => {
  it('scrive la data esatta in italiano, con il giorno della settimana', () => {
    expect(descriviQuando({ tipo: 'data', data: '2027-05-22' })).toBe('sabato 22 maggio 2027');
  });

  it('lascia il periodo com’è scritto', () => {
    expect(descriviQuando({ tipo: 'periodo', periodo: 'Maggio 2027' })).toBe('Maggio 2027');
  });
});

describe('ETICHETTE_STATO', () => {
  it('ha un’etichetta per ciascuno dei quattro stati', () => {
    expect(ETICHETTE_STATO).toEqual({
      bozza: 'Bozza',
      annunciata: 'Annunciata',
      conclusa: 'Conclusa',
      annullata: 'Annullata',
    });
  });
});

describe('validaLink', () => {
  it('accetta il vuoto (nessun link) e gli https', () => {
    expect(validaLink('')).toBeNull();
    expect(validaLink('https://pagamenti.example.test/pp')).toBeNull();
  });

  it('rifiuta http, testo libero e il solo prefisso', () => {
    expect(validaLink('http://pagamenti.example.test/pp')).toBe(
      'Il link deve iniziare con https://',
    );
    expect(validaLink('paypal.me/pizza')).toBe('Il link deve iniziare con https://');
    expect(validaLink('https://')).toBe('Il link deve iniziare con https://');
  });

  it('rifiuta i link troppo lunghi', () => {
    expect(validaLink(`https://${'a'.repeat(300)}`)).toMatch(/massimo 300 caratteri/);
  });
});
