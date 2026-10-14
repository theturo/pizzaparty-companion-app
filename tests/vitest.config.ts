import { defineConfig } from 'vitest/config';

// Test delle regole di sicurezza: girano contro gli emulatori Firebase (npm run test:regole).
export default defineConfig({
  test: {
    include: ['tests/regole/**/*.test.ts'],
    // Un solo file alla volta: i test condividono gli stessi emulatori.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
