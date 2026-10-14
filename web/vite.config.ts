import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  // Test unitari (Vitest): file *.test.ts accanto al codice. I test nel browser stanno in e2e/.
  test: { include: ['src/**/*.test.ts'] },
});
