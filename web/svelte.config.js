import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // Sito statico per GitHub Pages: ogni pagina diventa un file HTML.
    adapter: adapter({ pages: 'build', assets: 'build', fallback: '404.html', strict: true }),
    // CSP rigida generata da SvelteKit, con gli hash dei suoi script di avvio.
    csp: {
      mode: 'hash',
      directives: {
        'default-src': ['self'],
        'script-src': ['self'],
        // Unica eccezione: lo stile fisso di #svelte-announcer (annunci per i lettori di schermo),
        // autorizzato con il suo hash e nient'altro. Vedi wiki: architettura/Stack.
        'style-src': ['self', 'unsafe-hashes', 'sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo='],
        'img-src': ['self', 'data:'],
        'font-src': ['self'],
        'connect-src': ['self'],
        'manifest-src': ['self'],
        'worker-src': ['self'],
        'object-src': ['none'],
        'base-uri': ['self'],
        'form-action': ['self'],
      },
    },
  },
};
