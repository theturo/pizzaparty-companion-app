// "Segnala un problema" (D-037): una mail ad aiuto@ con i dettagli tecnici già compilati.
import { CONTATTO_AIUTO } from '$lib/legale';

export interface DettagliSegnalazione {
  versione: string;
  commit: string;
  dispositivo: string;
  installata: boolean;
  /** Codice tecnico dell'account, se si è fatto accesso. */
  uid?: string;
}

/** Link mailto: con oggetto e testo pronti; chi scrive aggiunge solo cosa è successo. */
export function linkSegnalazione(d: DettagliSegnalazione): string {
  const righe = [
    'Cosa è successo (e cosa stavi facendo)?',
    '',
    '',
    '',
    '— Dettagli per Arturo, lasciali così —',
    `Versione: ${d.versione} · ${d.commit}`,
    `Dispositivo: ${d.dispositivo} · ${d.installata ? 'app installata' : 'nel browser'}`,
    `Account: ${d.uid ?? 'nessun accesso'}`,
  ];
  const oggetto = encodeURIComponent("Problema con l'app");
  const testo = encodeURIComponent(righe.join('\n'));
  return `mailto:${CONTATTO_AIUTO}?subject=${oggetto}&body=${testo}`;
}
