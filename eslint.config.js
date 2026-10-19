// Controllo del codice: errori e cattive pratiche (l'aspetto lo gestisce Prettier).
import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import svelteConfig from './web/svelte.config.js';

export default ts.config(
  {
    ignores: [
      '**/node_modules/',
      '**/build/',
      'functions/lib/',
      '**/.svelte-kit/',
      '**/playwright-report/',
      '**/test-results/',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        // Interruttori iniettati da Vite al momento della build (web/vite.config.ts).
        __EMULATORI__: 'readonly',
        __ACCOUNT_ATTIVI__: 'readonly',
      },
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: { parser: ts.parser, extraFileExtensions: ['.svelte'], svelteConfig },
    },
  },
  {
    files: ['web/src/service-worker.ts'],
    languageOptions: { globals: globals.serviceworker },
  },
);
