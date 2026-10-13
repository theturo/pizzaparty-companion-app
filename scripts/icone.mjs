// Genera le icone PNG dell'app partendo da web/static/icons/icona.svg.
// Si lancia a mano quando cambia l'icona: npm run icone
import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const cartella = new URL('../web/static/icons/', import.meta.url);
const svg = await readFile(new URL('icona.svg', cartella));

const misure = {
  'icona-192.png': 192,
  'icona-512.png': 512,
  'icona-maskable-512.png': 512,
  'apple-touch-icon.png': 180,
};

for (const [nome, lato] of Object.entries(misure)) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: lato } }).render().asPng();
  await writeFile(new URL(nome, cartella), png);
  console.log(`✓ ${nome} (${lato}×${lato})`);
}
