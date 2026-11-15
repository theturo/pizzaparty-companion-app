import { describe, expect, it } from 'vitest';
import { percorsoDiRitorno } from './ritorno';

describe('percorsoDiRitorno', () => {
  it('accetta i percorsi interni, con query compresa', () => {
    expect(percorsoDiRitorno('/checkin?c=abcd-efgh-jkmn')).toBe('/checkin?c=abcd-efgh-jkmn');
    expect(percorsoDiRitorno('/profilo')).toBe('/profilo');
  });

  it('rifiuta i link esterni e i percorsi che iniziano con "//"', () => {
    expect(percorsoDiRitorno('https://esempio.org')).toBe('/');
    expect(percorsoDiRitorno('//esempio.org')).toBe('/');
    expect(percorsoDiRitorno('/\\esempio.org')).toBe('/');
    expect(percorsoDiRitorno('profilo')).toBe('/');
    expect(percorsoDiRitorno('')).toBe('/');
  });
});
