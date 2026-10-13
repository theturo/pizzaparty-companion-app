/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Service worker dell'app: la fa aprire anche senza rete e gestisce le nuove versioni.
// SvelteKit fornisce l'elenco dei file e un numero di versione diverso a ogni build.
import { build, files, prerendered, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `pizzaparty-${version}`;
// Tutto ciò che serve per aprire l'app offline: codice, file statici (tranne le licenze), pagine.
const RISORSE = [...build, ...files.filter((f) => !f.endsWith('.txt')), ...prerendered];

sw.addEventListener('install', (evento) => {
  // Niente skipWaiting automatico: la nuova versione aspetta che la persona tocchi "Aggiorna".
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(RISORSE)));
});

sw.addEventListener('message', (evento) => {
  if (evento.data === 'attiva-nuova-versione') sw.skipWaiting();
});

sw.addEventListener('activate', (evento) => {
  // Si cancellano le cache delle versioni precedenti.
  evento.waitUntil(
    caches
      .keys()
      .then((chiavi) => Promise.all(chiavi.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => sw.clients.claim()),
  );
});

sw.addEventListener('fetch', (evento) => {
  const richiesta = evento.request;
  if (richiesta.method !== 'GET') return;
  const url = new URL(richiesta.url);
  // Firebase e gli altri servizi esterni passano senza intercettazioni.
  if (url.origin !== sw.location.origin) return;
  evento.respondWith(rispondi(richiesta, url));
});

async function rispondi(richiesta: Request, url: URL): Promise<Response> {
  const cache = await caches.open(CACHE);
  // Prima la versione installata: codice e pagine restano coerenti tra loro.
  const salvata = await cache.match(url.pathname);
  if (salvata) return salvata;
  try {
    return await fetch(richiesta);
  } catch {
    // Senza rete, una pagina sconosciuta apre la Home invece di un errore del browser.
    if (richiesta.mode === 'navigate') {
      const home = await cache.match('/');
      if (home) return home;
    }
    return Response.error();
  }
}
