import { describe, expect, it } from 'vitest';
import {
  calcolaStatistiche,
  chiaveSegnaposto,
  eSegnaposto,
  presenzeDellaPersona,
  type EdizioneStatistica,
  type PresenzaStatistica,
} from './statistiche';

const edizioni: EdizioneStatistica[] = [
  { id: 'e2024', nome: 'Festa 2024', data: '2024-06-01' },
  { id: 'e2025', nome: 'Festa 2025', data: '2025-06-07' },
  { id: 'e2026', nome: 'Festa 2026', data: '2026-06-06' },
];

const sera = (edizione: string, chiave: string, nome?: string): PresenzaStatistica => ({
  edizione,
  chiave,
  nome,
});

describe('chiavi delle persone', () => {
  it('un segnaposto ha la chiave con il prefisso, un account no', () => {
    expect(chiaveSegnaposto('abc')).toBe('s:abc');
    expect(eSegnaposto('s:abc')).toBe(true);
    expect(eSegnaposto('uid123')).toBe(false);
  });
});

describe('panoramica per edizione', () => {
  const presenze: PresenzaStatistica[] = [
    sera('e2024', 'giulia', 'Giulia'),
    sera('e2024', 's:mario', 'Mario'),
    sera('e2025', 'giulia', 'Giulia'),
    sera('e2025', 'dino', 'Dino'),
    sera('e2025', 's:mario', 'Mario'),
    sera('e2026', 'dino', 'Dino'),
    sera('e2026', 's:luca', 'Luca'),
  ];

  const { perEdizione } = calcolaStatistiche(presenze, edizioni);

  it('ordina dalla più recente e conta presenti, account e senza account', () => {
    expect(perEdizione.map((e) => e.id)).toEqual(['e2026', 'e2025', 'e2024']);
    expect(perEdizione[0]).toMatchObject({ presenti: 2, account: 1, senzaAccount: 1 });
    expect(perEdizione[1]).toMatchObject({ presenti: 3, account: 2, senzaAccount: 1 });
    expect(perEdizione[2]).toMatchObject({ presenti: 2, account: 1, senzaAccount: 1 });
  });

  it('una nuova leva è alla prima presenza in assoluto', () => {
    // 2024: Giulia e Mario alla prima festa. 2025: Dino alla prima festa (nel 2026 torna, ma non è più nuova).
    // 2026: Luca alla prima festa.
    expect(perEdizione.find((e) => e.id === 'e2024')?.nuoveLeve).toBe(2);
    expect(perEdizione.find((e) => e.id === 'e2025')?.nuoveLeve).toBe(1);
    expect(perEdizione.find((e) => e.id === 'e2026')?.nuoveLeve).toBe(1);
  });

  it('una persona conta una volta per edizione anche con presenze doppie', () => {
    const doppie = [sera('e2024', 'giulia', 'Giulia'), sera('e2024', 'giulia', 'Giulia')];
    const riga = calcolaStatistiche(doppie, edizioni).perEdizione.find((e) => e.id === 'e2024');
    expect(riga).toMatchObject({ presenti: 1, account: 1, nuoveLeve: 1 });
  });
});

describe('fedelissimi', () => {
  it('ordina per numero di presenze e poi per nome, con tutte le persone', () => {
    const presenze = [
      sera('e2024', 'zeta', 'Zeno'),
      sera('e2025', 'zeta', 'Zeno'),
      sera('e2024', 'alba', 'Àlba'),
      sera('e2025', 'alba', 'Àlba'),
      sera('e2026', 'alba', 'Àlba'),
      sera('e2024', 's:bruno', 'Bruno'),
      sera('e2025', 's:carla', 'Carla'),
    ];
    const { fedelissimi } = calcolaStatistiche(presenze, edizioni);
    expect(fedelissimi.map((f) => [f.nome, f.presenze])).toEqual([
      ['Àlba', 3],
      ['Zeno', 2],
      ['Bruno', 1],
      ['Carla', 1],
    ]);
  });

  it('una persona senza nome resta in classifica con il nome vuoto', () => {
    const { fedelissimi } = calcolaStatistiche([sera('e2024', 'uid1')], edizioni);
    expect(fedelissimi).toEqual([{ chiave: 'uid1', nome: '', presenze: 1 }]);
  });
});

describe('presenze ignorate', () => {
  it('le edizioni senza data o inesistenti non contano', () => {
    const conDataMancante = [...edizioni, { id: 'periodo', nome: 'Estate', data: null }];
    const presenze = [
      sera('periodo', 'giulia', 'Giulia'),
      sera('fantasma', 'giulia', 'Giulia'),
      sera('e2024', 'dino', 'Dino'),
    ];
    const { perEdizione, fedelissimi } = calcolaStatistiche(presenze, conDataMancante);
    expect(perEdizione.map((e) => e.id)).not.toContain('periodo');
    expect(fedelissimi).toEqual([{ chiave: 'dino', nome: 'Dino', presenze: 1 }]);
  });

  it('una data non valida fa escludere l’edizione', () => {
    const { perEdizione } = calcolaStatistiche(
      [sera('rotta', 'giulia')],
      [{ id: 'rotta', nome: 'Rotta', data: '2026-13-01' }],
    );
    expect(perEdizione).toEqual([]);
  });
});

describe('profilo: le proprie presenze', () => {
  it('elenca le edizioni dalla più recente, senza ripetizioni e senza le ignote', () => {
    const elenco = presenzeDellaPersona(
      [
        { edizione: 'e2024' },
        { edizione: 'e2026' },
        { edizione: 'e2026' },
        { edizione: 'fantasma' },
      ],
      edizioni,
    );
    expect(elenco).toEqual([
      { id: 'e2026', nome: 'Festa 2026', data: '2026-06-06' },
      { id: 'e2024', nome: 'Festa 2024', data: '2024-06-01' },
    ]);
  });

  it('senza presenze, elenco vuoto', () => {
    expect(presenzeDellaPersona([], edizioni)).toEqual([]);
  });
});
