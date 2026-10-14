import { expect, test } from '@playwright/test';

test('la vetrina cambia tema e uscendo torna quello predefinito', async ({ page }) => {
  await page.goto('/stile');
  const radice = page.locator('html');
  await expect(radice).toHaveAttribute('data-tema', 'pizzaparty-2026');

  await page.getByRole('radio', { name: 'Prova · Odissea' }).click();
  await expect(radice).toHaveAttribute('data-tema', 'prova-odissea');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('text-transform', 'uppercase');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0b0e14');

  await page
    .getByRole('navigation', { name: 'Sezioni' })
    .getByRole('link', { name: 'Home' })
    .click();
  await expect(radice).toHaveAttribute('data-tema', 'pizzaparty-2026');
});
