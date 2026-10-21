import { describe, expect, it } from 'vitest';
import { linkSegnalazione } from './segnalazione';
import { descriviDispositivo } from './dispositivo';

const leggi = (link: string) => {
  const url = new URL(link);
  return {
    a: url.pathname,
    oggetto: url.searchParams.get('subject'),
    testo: url.searchParams.get('body') ?? '',
  };
};

describe('segnalazione di un problema', () => {
  it('prepara la mail per aiuto@ con versione, dispositivo e account', () => {
    const { a, oggetto, testo } = leggi(
      linkSegnalazione({
        versione: '0.6.0',
        commit: 'abc1234',
        dispositivo: 'iPhone · Safari',
        installata: true,
        uid: 'uid-di-prova',
      }),
    );
    expect(a).toBe('aiuto@pizza-party.net');
    expect(oggetto).toBe("Problema con l'app");
    expect(testo).toContain('Versione: 0.6.0 · abc1234');
    expect(testo).toContain('Dispositivo: iPhone · Safari · app installata');
    expect(testo).toContain('Account: uid-di-prova');
  });

  it('senza accesso lo dice, e non inventa un account', () => {
    const { testo } = leggi(
      linkSegnalazione({
        versione: '0.6.0',
        commit: 'locale',
        dispositivo: 'Mac · Firefox',
        installata: false,
      }),
    );
    expect(testo).toContain('Dispositivo: Mac · Firefox · nel browser');
    expect(testo).toContain('Account: nessun accesso');
  });

  it('gli spazi restano %20 (alcune app di posta mostrano i + come tali)', () => {
    expect(
      linkSegnalazione({ versione: '1', commit: 'c', dispositivo: 'd', installata: false }),
    ).not.toContain('+');
  });
});

describe('descrizione del dispositivo', () => {
  it.each([
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1',
      'iPhone · Safari',
    ],
    [
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36',
      'Android · Chrome',
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:131.0) Gecko/20100101 Firefox/131.0',
      'Mac · Firefox',
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0',
      'Windows · Edge',
    ],
  ])('%s', (ua, atteso) => {
    expect(descriviDispositivo(ua)).toBe(atteso);
  });
});
