import { describe, expect, it } from 'vitest';
import {
  decisioneSu,
  faseAccesso,
  mostraBarra,
  percorsoProtetto,
  type StatoSessione,
} from './accesso';

const ospite: StatoSessione = { stato: 'ospite', profilo: null, profiloCaricato: true };
const caricamento: StatoSessione = { stato: 'caricamento', profilo: null, profiloCaricato: false };
const senzaProfilo: StatoSessione = { stato: 'connesso', profilo: null, profiloCaricato: true };
const connessoCaricamento: StatoSessione = {
  stato: 'connesso',
  profilo: null,
  profiloCaricato: false,
};
const conStato = (stato: 'in_attesa' | 'approvato' | 'sospeso'): StatoSessione => ({
  stato: 'connesso',
  profilo: { stato },
  profiloCaricato: true,
});

describe('fase di accesso', () => {
  it('distingue ogni situazione', () => {
    expect(faseAccesso(caricamento)).toBe('caricamento');
    expect(faseAccesso(connessoCaricamento)).toBe('caricamento');
    expect(faseAccesso(ospite)).toBe('ospite');
    expect(faseAccesso(senzaProfilo)).toBe('senza_profilo');
    expect(faseAccesso(conStato('in_attesa'))).toBe('in_attesa');
    expect(faseAccesso(conStato('sospeso'))).toBe('sospeso');
    expect(faseAccesso(conStato('approvato'))).toBe('approvato');
  });

  it('la barra compare solo per chi è approvato', () => {
    expect(mostraBarra(conStato('approvato'))).toBe(true);
    for (const s of [
      caricamento,
      ospite,
      senzaProfilo,
      conStato('in_attesa'),
      conStato('sospeso'),
    ]) {
      expect(mostraBarra(s)).toBe(false);
    }
  });
});

describe('sezioni protette', () => {
  it('riconosce le sezioni riservate e i loro percorsi interni', () => {
    for (const p of ['/trofei', '/pizzagram', '/ordina', '/admin', '/admin/richieste']) {
      expect(percorsoProtetto(p)).toBe(true);
    }
  });

  it('lascia aperte le altre pagine, anche con nomi che iniziano allo stesso modo', () => {
    for (const p of [
      '/',
      '/profilo',
      '/accedi',
      '/registrati',
      '/completa',
      '/azione',
      '/privacy',
      '/condizioni',
      '/informazioni',
      '/stile',
      '/trofeiextra',
    ]) {
      expect(percorsoProtetto(p)).toBe(false);
    }
  });

  it('decide: mostra, attendi o rimanda', () => {
    // Pagine aperte: sempre mostrate, anche senza stato noto.
    expect(decisioneSu('/profilo', caricamento)).toBe('mostra');
    expect(decisioneSu('/', ospite)).toBe('mostra');
    // Sezioni riservate a chi è approvato.
    expect(decisioneSu('/trofei', conStato('approvato'))).toBe('mostra');
    expect(decisioneSu('/admin', conStato('approvato'))).toBe('mostra');
    expect(decisioneSu('/trofei', caricamento)).toBe('attendi');
    expect(decisioneSu('/trofei', connessoCaricamento)).toBe('attendi');
    expect(decisioneSu('/trofei', ospite)).toBe('rimanda');
    expect(decisioneSu('/ordina', senzaProfilo)).toBe('rimanda');
    expect(decisioneSu('/pizzagram', conStato('in_attesa'))).toBe('rimanda');
    expect(decisioneSu('/admin', conStato('sospeso'))).toBe('rimanda');
  });
});
