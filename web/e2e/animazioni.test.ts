import { expect, test, type Locator } from '@playwright/test';
import { accediComeApprovato } from './aiuti';

/** Nome e durata dell'animazione d'entrata calcolati dal browser. */
const animazione = (elemento: Locator) =>
  elemento.evaluate((el) => {
    const stile = getComputedStyle(el);
    return { nome: stile.animationName, durata: stile.animationDuration };
  });

/** Durata della transizione del primo elemento (in secondi). */
const durataTransizione = (elemento: Locator) =>
  elemento.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));

test.describe('senza preferenze', () => {
  test('schede e sezioni compaiono con un’animazione di 0.25s', async ({ page }) => {
    await accediComeApprovato(page);
    await page.goto('/profilo');
    const scheda = page.locator('.scheda').first();
    await expect(scheda).toBeVisible();
    const sezione = page.locator('.sezione');

    for (const elemento of [scheda, sezione]) {
      const { nome, durata } = await animazione(elemento);
      expect(nome).not.toBe('none');
      expect(durata).toBe('0.25s');
    }
  });

  test('tenendo premuto un pulsante questo si schiaccia', async ({ page }) => {
    await accediComeApprovato(page);
    await page.goto('/profilo');
    const pulsante = page.getByRole('button', { name: 'Modifica' });
    await expect(pulsante).toBeVisible();

    await pulsante.hover();
    await page.mouse.down();
    // Si aspetta che la transizione (150ms) porti il pulsante a schiacciarsi.
    await expect
      .poll(() => pulsante.evaluate((el) => getComputedStyle(el).transform))
      .not.toBe('none');
    // Si rilascia fuori dal pulsante: così non scatta il clic.
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });
});

test.describe('sul PC', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test('passando il mouse su una voce non attiva, lo sfondo cambia', async ({ page }) => {
    await accediComeApprovato(page);
    await page.goto('/');
    const voce = page.getByRole('navigation', { name: 'Sezioni' }).getByRole('link', {
      name: 'Trofei',
    });
    await expect(voce).toBeVisible();
    const sfondoPrima = await voce.evaluate((el) => getComputedStyle(el).backgroundColor);

    await voce.hover();
    await expect
      .poll(() => voce.evaluate((el) => getComputedStyle(el).backgroundColor))
      .not.toBe(sfondoPrima);
  });
});

test.describe('con «riduci movimento»', () => {
  test.use({ reducedMotion: 'reduce' });

  test('le schede non si animano e i pulsanti non fanno transizioni', async ({ page }) => {
    await accediComeApprovato(page);
    await page.goto('/profilo');
    const scheda = page.locator('.scheda').first();
    await expect(scheda).toBeVisible();

    const { durata } = await animazione(scheda);
    expect(parseFloat(durata)).toBeLessThanOrEqual(0.01);

    const pulsante = page.getByRole('button', { name: 'Modifica' });
    await expect(pulsante).toBeVisible();
    expect(await durataTransizione(pulsante)).toBeLessThanOrEqual(0.01);
  });
});
