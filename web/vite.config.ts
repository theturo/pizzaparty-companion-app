import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

/** Versione dell'app (package.json della radice), commit e data della build: visibili in /informazioni. */
function infoBuild() {
  const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  let commit = process.env.GITHUB_SHA?.slice(0, 7);
  if (!commit) {
    try {
      commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
    } catch {
      commit = 'locale';
    }
  }
  return { versione: version as string, commit, data: new Date().toISOString().slice(0, 10) };
}

export default defineConfig(({ mode }) => {
  const build = infoBuild();
  // Emulatori Firebase: sempre in sviluppo, e nelle build di prova con EMULATORI=true (test end-to-end).
  const emulatori = mode === 'development' || process.env.EMULATORI === 'true';

  return {
    plugins: [sveltekit()],
    define: {
      __VERSIONE__: JSON.stringify(build.versione),
      __COMMIT__: JSON.stringify(build.commit),
      __DATA_BUILD__: JSON.stringify(build.data),
      __EMULATORI__: JSON.stringify(emulatori),
    },
    // Il CHANGELOG sta nella radice della repo, fuori da web/.
    server: { fs: { allow: ['..'] } },
    // Test unitari (Vitest): file *.test.ts accanto al codice. I test nel browser stanno in e2e/.
    test: { include: ['src/**/*.test.ts'] },
  };
});
