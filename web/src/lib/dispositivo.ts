// Descrizione breve del dispositivo: nei dati delle notifiche e nelle segnalazioni di problemi.

/** Es. "iPhone · Safari": sistema e browser, senza versioni né altri dettagli. */
export function descriviDispositivo(ua: string = navigator.userAgent): string {
  const sistema = /iPhone|iPad|iPod/.test(ua)
    ? 'iPhone'
    : /Android/.test(ua)
      ? 'Android'
      : /Mac/.test(ua)
        ? 'Mac'
        : /Windows/.test(ua)
          ? 'Windows'
          : 'Altro';
  const browser = /Firefox/.test(ua)
    ? 'Firefox'
    : /Edg\//.test(ua)
      ? 'Edge'
      : /Chrome|CriOS/.test(ua)
        ? 'Chrome'
        : /Safari/.test(ua)
          ? 'Safari'
          : 'browser';
  return `${sistema} · ${browser}`;
}

/** L'app è aperta dall'icona sulla schermata Home (installata) e non in una scheda del browser. */
export function appInstallata(): boolean {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
