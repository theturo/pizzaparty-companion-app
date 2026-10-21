import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Servizi Firebase usati dal browser (accesso, sessione, database, Cloud Functions).
const firebase = [
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
  'https://firestore.googleapis.com',
  'https://europe-west8-pizzaparty-companion.cloudfunctions.net',
  // Notifiche push (D-036)
  'https://fcmregistrations.googleapis.com',
  'https://firebaseinstallations.googleapis.com',
];
// Emulatori locali: solo in sviluppo e nelle build di prova (EMULATORI=true).
const emulatori =
  process.env.NODE_ENV !== 'production' || process.env.EMULATORI === 'true'
    ? [
        'http://localhost:9099',
        'http://127.0.0.1:9099',
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:5001',
      ]
    : [];

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // Sito statico per GitHub Pages: ogni pagina diventa un file HTML.
    adapter: adapter({ pages: 'build', assets: 'build', fallback: '404.html', strict: true }),
    // Il service worker lo registriamo noi (lib/pwa/aggiornamenti), per gestire il banner "Nuova versione".
    serviceWorker: { register: false },
    // CSP rigida generata da SvelteKit, con gli hash dei suoi script di avvio.
    csp: {
      mode: 'hash',
      directives: {
        'default-src': ['self'],
        'script-src': ['self'],
        // Unica eccezione: lo stile fisso di #svelte-announcer (annunci per i lettori di schermo),
        // autorizzato con il suo hash e nient'altro. Vedi wiki: architettura/Stack.
        'style-src': [
          'self',
          'unsafe-hashes',
          'sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo=',
        ],
        'img-src': ['self', 'data:'],
        'font-src': ['self'],
        'connect-src': ['self', ...firebase, ...emulatori],
        'manifest-src': ['self'],
        'worker-src': ['self'],
        'object-src': ['none'],
        'base-uri': ['self'],
        'form-action': ['self'],
      },
    },
  },
};
