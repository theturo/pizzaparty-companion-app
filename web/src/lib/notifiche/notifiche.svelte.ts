// Notifiche push su questo dispositivo (D-036): permesso, codice del dispositivo, attiva/disattiva.
import { firebase } from '$lib/firebase/app';
import { CHIAVE_WEB_PUSH } from '$lib/firebase/config';
import { appInstallata, descriviDispositivo } from '$lib/dispositivo';

const CHIAVE_CODICE = 'pizzaparty-codice-notifiche';
const CHIAVE_INVITO_CHIUSO = 'pizzaparty-invito-notifiche-chiuso';

export const notifiche = $state({
  /** Il browser sa ricevere notifiche push. */
  supportate: false,
  /** iPhone/iPad con l'app aperta in Safari: le notifiche funzionano solo dall'app installata. */
  iosDaInstallare: false,
  permesso: 'default' as NotificationPermission,
  /** Questo dispositivo è registrato per ricevere le notifiche. */
  attive: false,
  invitoChiuso: false,
});

function leggi(chiave: string): string | null {
  try {
    return localStorage.getItem(chiave);
  } catch {
    return null;
  }
}
function scrivi(chiave: string, valore: string | null) {
  try {
    if (valore === null) localStorage.removeItem(chiave);
    else localStorage.setItem(chiave, valore);
  } catch {
    // Archivio non disponibile: pazienza.
  }
}

/** Legge lo stato del dispositivo: va chiamata nel browser (es. in un $effect). */
export function controllaNotifiche(): void {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  notifiche.iosDaInstallare = ios && !appInstallata();
  notifiche.supportate =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  notifiche.permesso = 'Notification' in window ? Notification.permission : 'denied';
  notifiche.attive = notifiche.permesso === 'granted' && leggi(CHIAVE_CODICE) !== null;
  notifiche.invitoChiuso = leggi(CHIAVE_INVITO_CHIUSO) !== null;
}

export class NotificheNegate extends Error {}

/** Chiede il permesso (va chiamata da un tocco) e registra il dispositivo. */
export async function attivaNotifiche(): Promise<void> {
  const permesso = await Notification.requestPermission();
  notifiche.permesso = permesso;
  if (permesso !== 'granted') throw new NotificheNegate();

  const { auth, db, app } = firebase();
  const utente = auth.currentUser;
  if (!utente) throw new Error('Sessione assente');

  let codice: string;
  if (__EMULATORI__) {
    // Negli emulatori non c'è Cloud Messaging: un codice finto basta a provare il resto.
    codice = `emulatore-${crypto.randomUUID()}`;
  } else {
    const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
    if (!(await isSupported())) throw new Error('Notifiche non supportate');
    codice = await getToken(getMessaging(app), {
      vapidKey: CHIAVE_WEB_PUSH,
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
    });
  }

  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  await setDoc(doc(db, 'utenti', utente.uid, 'dispositivi', codice), {
    piattaforma: descriviDispositivo(),
    creato: serverTimestamp(),
  });
  scrivi(CHIAVE_CODICE, codice);
  notifiche.attive = true;
}

/** Toglie questo dispositivo: niente più notifiche qui (anche uscendo dall'account). */
export async function disattivaNotifiche(): Promise<void> {
  const codice = leggi(CHIAVE_CODICE);
  scrivi(CHIAVE_CODICE, null);
  notifiche.attive = false;
  if (!codice) return;
  const { auth, db, app } = firebase();
  const utente = auth.currentUser;
  if (utente) {
    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'utenti', utente.uid, 'dispositivi', codice)).catch(() => {});
  }
  if (!__EMULATORI__) {
    const { getMessaging, deleteToken } = await import('firebase/messaging');
    await deleteToken(getMessaging(app)).catch(() => {});
  }
}

export function chiudiInvito(): void {
  scrivi(CHIAVE_INVITO_CHIUSO, '1');
  notifiche.invitoChiuso = true;
}
