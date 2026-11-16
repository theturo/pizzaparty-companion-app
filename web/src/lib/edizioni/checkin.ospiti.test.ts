import { describe, expect, it } from 'vitest';
import { erroreNomeOspite } from './checkin';

const ERRORE = 'Scrivi un nome tra 2 e 40 caratteri.';

describe('nome dell’ospite nel browser (D-067)', () => {
  it('accetta da 2 a 40 caratteri, spazi compresi nella misura', () => {
    expect(erroreNomeOspite('Al')).toBeNull();
    expect(erroreNomeOspite('  Anna   Maria  ')).toBeNull();
    expect(erroreNomeOspite('a'.repeat(40))).toBeNull();
  });

  it('rifiuta un nome troppo corto (anche con soli spazi) o troppo lungo', () => {
    expect(erroreNomeOspite('')).toBe(ERRORE);
    expect(erroreNomeOspite('   ')).toBe(ERRORE);
    expect(erroreNomeOspite(' a ')).toBe(ERRORE);
    expect(erroreNomeOspite('a'.repeat(41))).toBe(ERRORE);
  });
});
