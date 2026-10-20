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

// ---- Notifiche push (D-036) ----
// Il server manda messaggi "solo dati" (Firebase Cloud Messaging): li mostriamo noi, sempre uguali.
sw.addEventListener('push', (evento) => {
  let messaggio: { data?: Record<string, string> } = {};
  try {
    messaggio = evento.data?.json() ?? {};
  } catch {
    // Messaggio non leggibile: si mostra comunque un avviso generico.
  }
  const dati = messaggio.data ?? {};
  evento.waitUntil(
    sw.registration.showNotification(dati.titolo || 'PizzaParty', {
      body: dati.testo,
      icon: '/icons/icona-192.png',
      badge: '/icons/icona-192.png',
      data: { link: dati.link || '/' },
    }),
  );
});

// Toccando la notifica si apre (o si porta in primo piano) l'app sulla pagina giusta.
sw.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const link = new URL(evento.notification.data?.link ?? '/', sw.location.origin).href;
  evento.waitUntil(
    (async () => {
      const finestre = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const finestra = finestre[0];
      if (finestra) {
        await finestra.navigate(link);
        await finestra.focus();
      } else {
        await sw.clients.openWindow(link);
      }
    })(),
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
