import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AVATAR, immagineAvatar } from './avatar';

describe('immagini degli avatar', () => {
  it('ogni avatar ha il suo file WebP in web/static/avatar', () => {
    const cartella = new URL('../../../static/avatar/', import.meta.url);
    for (const avatar of AVATAR) {
      expect(existsSync(new URL(`${avatar.id}.webp`, cartella)), avatar.id).toBe(true);
    }
  });

  it('il percorso dell immagine si ricava dall id', () => {
    expect(immagineAvatar('dinosauro')).toMatch(/\/avatar\/dinosauro\.webp$/);
  });

  it('il dinosauro è tra le scelte', () => {
    expect(AVATAR.map((a) => a.id)).toContain('dinosauro');
    expect(AVATAR).toHaveLength(13);
  });
});
