import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TEMI, TEMA_PREDEFINITO } from './temi';

describe('registro dei temi', () => {
  it('ha identificativi unici', () => {
    const id = TEMI.map((t) => t.id);
    expect(new Set(id).size).toBe(id.length);
  });

  it('contiene il tema predefinito', () => {
    expect(TEMI.some((t) => t.id === TEMA_PREDEFINITO)).toBe(true);
  });

  it.each(TEMI.map((t) => t.id))('il tema %s ha il suo file CSS con il selettore giusto', (id) => {
    const css = readFileSync(new URL(`./temi/${id}.css`, import.meta.url), 'utf8');
    expect(css).toContain(`[data-tema='${id}']`);
  });

  it("l'app parte con il tema predefinito", () => {
    const html = readFileSync(new URL('../../app.html', import.meta.url), 'utf8');
    expect(html).toContain(`data-tema="${TEMA_PREDEFINITO}"`);
  });
});
