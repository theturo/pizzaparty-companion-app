import { describe, expect, it } from 'vitest';
import { percorsoDiRitorno } from './ritorno';

describe('percorsoDiRitorno', () => {
  it('lascia invariati i percorsi interni, query compresa', () => {
    expect(percorsoDiRitorno('/checkin?c=abcd-efgh-ijkl')).toBe('/checkin?c=abcd-efgh-ijkl');
    expect(percorsoDiRitorno('/profilo')).toBe('/profilo');
  });

  it('manda alla Home ogni valore che porterebbe fuori dall’app', () => {
    const fuori = [
      '/\t/evil.com',
      '/\n/evil.com',
      '/\r/evil.com',
      '/\\evil.com',
      '//evil.com',
      'https://evil.com',
      'javascript:alert(1)',
      'profilo',
      '',
    ];
    for (const valore of fuori) expect(percorsoDiRitorno(valore)).toBe('/');
  });
});
