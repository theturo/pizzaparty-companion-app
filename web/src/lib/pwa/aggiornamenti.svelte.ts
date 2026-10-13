// Registrazione del service worker e avviso "Nuova versione disponibile".
import { dev } from '$app/environment';

export const pwa = $state({ nuovaVersione: false });

let inAttesa: ServiceWorker | null = null;

export async function registraServiceWorker(): Promise<void> {
  // In sviluppo niente cache: si vede sempre il codice appena modificato.
  if (dev || !('serviceWorker' in navigator)) return;

  // Se la pagina era già gestita da un service worker, un cambio di versione richiede la ricarica.
  // Alla primissima visita no: la pagina è già quella giusta.
  const giaControllata = navigator.serviceWorker.controller !== null;
  let ricaricata = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (giaControllata && !ricaricata) {
      ricaricata = true;
      location.reload();
    }
  });

  const registrazione = await navigator.serviceWorker.register('/service-worker.js');

  const segnala = (nuovo: ServiceWorker) => {
    inAttesa = nuovo;
    pwa.nuovaVersione = true;
  };
  if (registrazione.waiting && giaControllata) segnala(registrazione.waiting);
  registrazione.addEventListener('updatefound', () => {
    const nuovo = registrazione.installing;
    nuovo?.addEventListener('statechange', () => {
      if (nuovo.state === 'installed' && navigator.serviceWorker.controller) segnala(nuovo);
    });
  });

  // Si cerca una nuova versione quando l'app torna in primo piano e comunque ogni ora.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') registrazione.update();
  });
  setInterval(() => registrazione.update(), 60 * 60 * 1000);
}

/** Attiva la versione in attesa: il service worker prende il controllo e la pagina si ricarica. */
export function aggiorna(): void {
  inAttesa?.postMessage('attiva-nuova-versione');
}
