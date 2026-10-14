import { defineConfig, devices } from '@playwright/test';

// Test end-to-end: l'app compilata, usata come farebbe una persona da telefono.
// Chromium copre Chrome/Android, WebKit il Safari degli iPhone.
//
// Playwright non scarica più i suoi browser su macOS 13: in locale si usa il Google Chrome
// installato sul Mac e WebKit gira solo in CI (Ubuntu), dove ci sono tutti e due.
const inCI = !!process.env.CI;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: inCI,
  retries: inCI ? 1 : 0,
  reporter: inCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium-telefono',
      use: { ...devices['Pixel 7'], ...(inCI ? {} : { channel: 'chrome' }) },
    },
    ...(inCI ? [{ name: 'webkit-telefono', use: { ...devices['iPhone 15'] } }] : []),
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !inCI,
    timeout: 180_000,
  },
});
