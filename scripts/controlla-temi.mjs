// Controlla che ogni tema rispetti la "base fissa" del sistema grafico (D-023):
// fondo scuro, testo leggibile (contrasto WCAG AA), temi registrati in modo coerente.
// Si lancia con: npm run controlla-temi (fa parte di npm run check, quindi gira anche in CI).
import { readFile, readdir } from 'node:fs/promises';

const cartella = new URL('../web/src/lib/tema/', import.meta.url);
const fileTemi = (await readdir(new URL('temi/', cartella))).filter((f) => f.endsWith('.css'));
const registro = await readFile(new URL('temi.ts', cartella), 'utf8');
const ingresso = await readFile(new URL('tema.css', cartella), 'utf8');

// Coppie [primo piano, sfondo, contrasto minimo]: 4.5 è la soglia AA per il testo normale.
const COPPIE = [
  ['testo', 'sfondo', 4.5],
  ['testo', 'superficie', 4.5],
  ['testo-attenuato', 'sfondo', 4.5],
  ['testo-attenuato', 'superficie', 4.5],
  ['testo-attenuato', 'sfondo-2', 4.5],
  ['accento', 'sfondo', 4.5],
  ['accento', 'superficie', 4.5],
  ['accento', 'sfondo-2', 4.5],
  ['sul-accento', 'accento', 4.5],
];
const SFONDO_MASSIMO = 0.05; // luminanza relativa: sopra questa soglia il fondo non è più "scuro"

const luminanza = (hex) => {
  const [r, g, b] = hex.match(/\w\w/g).map((c) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrasto = (a, b) => {
  const [chiaro, scuro] = [luminanza(a), luminanza(b)].sort((x, y) => y - x);
  return (chiaro + 0.05) / (scuro + 0.05);
};

let errori = 0;
const errore = (messaggio) => {
  errori++;
  console.log(`  ✗ ${messaggio}`);
};

for (const file of fileTemi) {
  const id = file.replace(/\.css$/, '');
  const css = await readFile(new URL(`temi/${file}`, cartella), 'utf8');
  const erroriPrima = errori;
  console.log(`Tema ${id}`);

  if (!css.includes(`[data-tema='${id}']`)) errore(`manca il selettore [data-tema='${id}']`);
  if (!registro.includes(`id: '${id}'`)) errore('non è elencato in temi.ts');
  if (!ingresso.includes(`./temi/${file}`)) errore('non è importato in tema.css');

  const colori = Object.fromEntries(
    [...css.matchAll(/--tema-([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(([, nome, valore]) => [nome, valore]),
  );
  for (const [primo, sfondo, minimo] of COPPIE) {
    if (!colori[primo] || !colori[sfondo]) {
      errore(`manca --tema-${colori[primo] ? sfondo : primo} (colore in formato #rrggbb)`);
      continue;
    }
    const valore = contrasto(colori[primo], colori[sfondo]);
    if (valore < minimo) errore(`${primo} su ${sfondo}: contrasto ${valore.toFixed(2)} (minimo ${minimo})`);
  }
  if (colori.sfondo && luminanza(colori.sfondo) > SFONDO_MASSIMO) {
    errore(`lo sfondo ${colori.sfondo} è troppo chiaro: la base dell'app è scura`);
  }
  if (errori === erroriPrima) console.log('  ✓ fondo scuro e contrasti a norma');
}

if (errori) {
  console.log(`\n${errori} problema/i nei temi.`);
  process.exit(1);
}
