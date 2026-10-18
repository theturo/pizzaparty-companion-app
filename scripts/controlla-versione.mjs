// Controllo delle PR: la versione in package.json deve essere più alta di quella su main
// e il CHANGELOG deve avere la sua sezione. Si lancia con: npm run controlla-versione
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const confronta = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
};

const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const changelog = await readFile('CHANGELOG.md', 'utf8');
let errori = 0;

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.log(`✗ Versione "${version}" non valida: usa il formato 0.4.1`);
  errori++;
}
if (
  !new RegExp(`^## ${version.replaceAll('.', '\\.')} — \\d{4}-\\d{2}-\\d{2}$`, 'm').test(changelog)
) {
  console.log(`✗ Nel CHANGELOG.md manca la sezione "## ${version} — AAAA-MM-GG"`);
  errori++;
}

let suMain = null;
try {
  suMain = JSON.parse(
    execFileSync('git', ['show', 'origin/main:package.json'], { encoding: 'utf8' }),
  ).version;
} catch {
  console.log('ℹ️  origin/main non disponibile: salto il confronto con main.');
}
if (suMain && confronta(version, suMain) <= 0) {
  console.log(`✗ La versione ${version} deve essere più alta di quella su main (${suMain})`);
  errori++;
}

if (errori) process.exit(1);
console.log(`✓ Versione ${version}${suMain ? ` (main: ${suMain})` : ''} e CHANGELOG a posto`);
