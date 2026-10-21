import { defineConfig, devices } from '@playwright/test';

// Test end-to-end: l'app compilata, usata come farebbe una persona da telefono.
// Chromium copre Chrome/Android, WebKit il Safari degli iPhone.
//
// Playwright non scarica più i suoi browser su macOS 13: in locale si usa il Google Chrome
// installato sul Mac e WebKit gira solo in CI (Ubuntu), dove ci sono tutti e due.
// In CI si usa il Chromium completo ('chromium') e non la versione ridotta predefinita
// (headless shell), che segna sempre le notifiche come bloccate.
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
      use: { ...devices['Pixel 7'], channel: inCI ? 'chromium' : 'chrome' },
    },
    ...(inCI ? [{ name: 'webkit-telefono', use: { ...devices['iPhone 15'] } }] : []),
  ],
  webServer: [
    // Emulatori Firebase (Auth, Firestore, Functions) con il progetto finto: mai i dati reali.
    {
      command:
        'npm run build -w functions && sh scripts/emulatori.sh --only auth,firestore,functions',
      cwd: '..',
      // Pronti solo quando anche le Functions sono caricate (l'ultima dell'elenco risponde):
      // altrimenti i primi test scrivono prima che i trigger siano in ascolto.
      url: 'http://127.0.0.1:5001/demo-pizzaparty/europe-west8/rigeneraInvito',
      reuseExistingServer: !inCI,
      timeout: 120_000,
      // Chiusura come un Ctrl+C: Firebase spegne anche gli emulatori Java (altrimenti restano accesi).
      gracefulShutdown: { signal: 'SIGINT', timeout: 15_000 },
    },
    // L'app compilata collegata agli emulatori, con gli account attivi.
    {
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      env: { EMULATORI: 'true' },
      url: 'http://localhost:4173',
      reuseExistingServer: !inCI,
      timeout: 180_000,
    },
  ],
});
