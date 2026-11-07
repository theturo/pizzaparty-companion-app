import { expect, test, type Page } from '@playwright/test';

// La mascotte è un'immagine (WebP) con quattro pose; i gesti sono animazioni CSS (D-049).
const NOME_DINO = 'Il dinosauro del PizzaParty';
const POSE = ['aspetta', 'saluta', 'festeggia', 'corre'] as const;

const immagine = (page: Page, posa: string) =>
  page.locator(`img[src*="/dinosauro/${posa}-360"]`).first();

test.describe('da ospite', () => {
  test("la pagina d'ingresso mostra il dinosauro che saluta, caricato e con il gesto", async ({
    page,
  }) => {
    await page.goto('/');
    const dino = page.getByRole('img', { name: NOME_DINO });
    await expect(dino).toBeVisible();
    await expect(dino).toHaveAttribute('src', /saluta-360\.webp$/);
    await expect
      .poll(() => dino.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    expect(await dino.evaluate((el) => getComputedStyle(el).animationName)).toBe('dondolio');
  });
});

test.describe('nella vetrina dello stile', () => {
  test('le quattro pose sono caricate; la Caricamento ha il suo nome; la pellicola scorre', async ({
    page,
  }) => {
    await page.goto('/stile');
    for (const posa of POSE) {
      const img = immagine(page, posa);
      await expect(img).toHaveAttribute('src', new RegExp(`${posa}-360\\.webp$`));
      await expect
        .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
        .toBeGreaterThan(0);
    }

    const caricamento = page.getByRole('status', { name: 'Caricamento in corso' });
    await expect(caricamento).toBeAttached();
    const fori = caricamento.locator('.fori').first();
    expect(await fori.evaluate((el) => getComputedStyle(el).animationName)).not.toBe('none');
  });

  test('il dinosauro «verso destra» è specchiato; quello normale no', async ({ page }) => {
    await page.goto('/stile');
    const specchiato = page.locator('.specchio.destra');
    await expect(specchiato).toHaveCount(1);
    expect(await specchiato.evaluate((el) => getComputedStyle(el).transform)).not.toBe('none');

    const normale = page.locator('.specchio:not(.destra)').first();
    expect(await normale.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
  });
});

test.describe('con «riduci movimento»', () => {
  test.use({ reducedMotion: 'reduce' });

  test('il dinosauro non si muove: la durata del gesto è azzerata', async ({ page }) => {
    await page.goto('/');
    const dino = page.getByRole('img', { name: NOME_DINO });
    await expect(dino).toBeVisible();
    const durata = await dino.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
    expect(durata).toBeLessThanOrEqual(0.01);
  });
});
