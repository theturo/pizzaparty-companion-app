import { describe, expect, it } from 'vitest';
import { codiceDaQr, messaggioDiErrore } from './checkin';

const CODICE = 'abcd-efg2-hjk9';
const LOCALE = 'http://localhost:4173';

describe('codiceDaQr', () => {
  it('accetta il link sull’app pubblicata', () => {
    expect(codiceDaQr(`https://app.pizza-party.net/checkin?c=${CODICE}`)).toBe(CODICE);
  });

  it('accetta il link sull’origine corrente (test in locale)', () => {
    expect(codiceDaQr(`${LOCALE}/checkin?c=${CODICE}`, LOCALE)).toBe(CODICE);
    expect(codiceDaQr(`${LOCALE}/checkin?c=${CODICE}`)).toBeNull();
  });

  it('rifiuta i link di altri siti, anche con lo stesso percorso', () => {
    expect(codiceDaQr(`https://esempio.it/checkin?c=${CODICE}`)).toBeNull();
    expect(codiceDaQr(`https://app.pizza-party.net.evil.it/checkin?c=${CODICE}`)).toBeNull();
    expect(codiceDaQr(`http://app.pizza-party.net/checkin?c=${CODICE}`)).toBeNull();
  });

  it('rifiuta gli schemi che non sono http(s)', () => {
    expect(codiceDaQr(`javascript:alert('checkin?c=${CODICE}')`)).toBeNull();
    expect(codiceDaQr(`data:text/html,checkin?c=${CODICE}`)).toBeNull();
  });

  it('rifiuta un percorso diverso da /checkin', () => {
    expect(codiceDaQr(`https://app.pizza-party.net/profilo?c=${CODICE}`)).toBeNull();
    expect(codiceDaQr(`https://app.pizza-party.net/checkin/?c=${CODICE}`)).toBeNull();
  });

  it('accetta il solo codice nel formato giusto, anche con spazi intorno', () => {
    expect(codiceDaQr(CODICE)).toBe(CODICE);
    expect(codiceDaQr(`  ${CODICE}\n`)).toBe(CODICE);
  });

  it('rifiuta il codice in formato sbagliato', () => {
    expect(codiceDaQr('abcd-efgh-jk')).toBeNull();
    expect(codiceDaQr('abcd-efg0-hjk9')).toBeNull(); // lo zero non è nell’alfabeto
    expect(codiceDaQr('abcdefghjk9x')).toBeNull();
    expect(codiceDaQr('')).toBeNull();
    expect(codiceDaQr('ciao, sono un biglietto')).toBeNull();
  });

  it('rifiuta un link con il codice nel formato sbagliato o senza codice', () => {
    expect(codiceDaQr('https://app.pizza-party.net/checkin?c=abc')).toBeNull();
    expect(codiceDaQr('https://app.pizza-party.net/checkin')).toBeNull();
    expect(codiceDaQr('https://app.pizza-party.net/checkin?c=')).toBeNull();
  });

  it('rifiuta un link con più codici', () => {
    expect(
      codiceDaQr(`https://app.pizza-party.net/checkin?c=${CODICE}&c=abcd-efg2-hjk8`),
    ).toBeNull();
  });

  it('ignora gli altri parametri del link', () => {
    expect(
      codiceDaQr(`https://app.pizza-party.net/checkin?utm_source=stampa&c=${CODICE}&x=1`),
    ).toBe(CODICE);
  });
});

describe('messaggioDiErrore', () => {
  it('usa il messaggio del server quando è leggibile', () => {
    const errore = { code: 'functions/failed-precondition', message: 'Il check-in è aperto.' };
    expect(messaggioDiErrore(errore)).toBe('Il check-in è aperto.');
  });

  it('per gli altri errori dà il messaggio generico', () => {
    expect(messaggioDiErrore({ code: 'functions/internal', message: 'boh' })).toBe(
      'Non sono riuscito a registrare la presenza. Riprova tra poco.',
    );
    expect(messaggioDiErrore(undefined)).toBe(
      'Non sono riuscito a registrare la presenza. Riprova tra poco.',
    );
  });
});
