import { describe, expect, it } from 'vitest';
import {
  controllaNome,
  controllaPassword,
  avatarValido,
  codiceInvitoValido,
  NOME_MAX,
} from './profilo';
import { AVATAR } from './avatar';

describe('controlli del profilo', () => {
  it('accetta un nome normale e ne rifiuta uno vuoto o troppo lungo', () => {
    expect(controllaNome('  Arturo  ')).toBeNull();
    expect(controllaNome(' A ')).not.toBeNull();
    expect(controllaNome('x'.repeat(NOME_MAX + 1))).not.toBeNull();
  });

  it('vuole password di almeno 8 caratteri e uguali', () => {
    expect(controllaPassword('pizzapizza', 'pizzapizza')).toBeNull();
    expect(controllaPassword('corta', 'corta')).toMatch(/almeno 8/);
    expect(controllaPassword('pizzapizza', 'pizzapazza')).toMatch(/non coincidono/);
  });

  it('riconosce solo gli avatar esistenti', () => {
    expect(avatarValido(AVATAR[0].id)).toBe(true);
    expect(avatarValido('ananas')).toBe(false);
  });

  it("accetta solo codici d'invito semplici", () => {
    expect(codiceInvitoValido('a1b2-c3d4')).toBe(true);
    expect(codiceInvitoValido('<script>')).toBe(false);
  });

  it('ha avatar con id unici', () => {
    expect(new Set(AVATAR.map((a) => a.id)).size).toBe(AVATAR.length);
  });
});

describe('allineamento con le regole di Firestore', () => {
  it('le regole ammettono esattamente gli stessi avatar', async () => {
    const { readFileSync } = await import('node:fs');
    const regole = readFileSync(
      new URL('../../../../firebase/firestore.rules', import.meta.url),
      'utf8',
    );
    const elenco = regole.match(/avatar in \[([^\]]+)\]/)?.[1] ?? '';
    const nelleRegole = [...elenco.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(nelleRegole).toEqual(AVATAR.map((a) => a.id));
  });
});
