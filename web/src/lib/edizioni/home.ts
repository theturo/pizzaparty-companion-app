// Che cosa mostra la Home della prossima edizione (D-056): funzioni pure, senza Firebase né DOM.
import type { Edizione } from './edizione';

const MINUTI_AL_GIORNO = 24 * 60;
const MILLISECONDI_AL_GIORNO = 24 * 60 * 60 * 1000;

/** Stati che la Home può mostrare: le bozze e le edizioni concluse restano nel pannello. */
const STATI_IN_HOME: readonly Edizione['stato'][] = ['annunciata', 'annullata'];

export function puoEssereInHome(edizione: Edizione): boolean {
  return STATI_IN_HOME.includes(edizione.stato);
}

/** Millisecondi di `creato`: un Timestamp di Firestore, un numero, oppure nulla se manca. */
function millisecondiDi(creato: unknown): number | null {
  if (typeof creato === 'number') return creato;
  if (creato !== null && typeof creato === 'object' && 'toMillis' in creato) {
    const { toMillis } = creato as { toMillis: unknown };
    if (typeof toMillis === 'function') return (toMillis as () => number).call(creato);
  }
  return null;
}

/**
 * La più recente per `creato` tra le edizioni annunciate o annullate.
 * Un `creato` mancante conta come più vecchio di qualunque data; in caso di parità vince la prima.
 */
export function scegliEdizioneHome(edizioni: Edizione[]): Edizione | null {
  let scelta: Edizione | null = null;
  let millisScelta = -Infinity;
  for (const edizione of edizioni) {
    if (!puoEssereInHome(edizione)) continue;
    const millis = millisecondiDi(edizione.creato) ?? -Infinity;
    if (scelta === null || millis > millisScelta) {
      scelta = edizione;
      millisScelta = millis;
    }
  }
  return scelta;
}

export interface Mancano {
  giorni: number;
  ore: number;
  minuti: number;
}

/**
 * Quanto manca alla mezzanotte locale di inizio del giorno `data` (AAAA-MM-GG).
 * Si conta sull'orologio da muro: così il cambio dell'ora legale non sposta il conto di un'ora.
 * Restituisce 'oggi' se `adesso` cade in quel giorno, 'passata' se il giorno è finito.
 */
export function tempoMancante(data: string, adesso: Date): Mancano | 'oggi' | 'passata' {
  const [anno, mese, giorno] = data.split('-').map(Number);
  const inizio = new Date(anno, mese - 1, giorno);
  const oggi = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate());
  // Arrotondare il numero di giorni assorbe le 23 o 25 ore dei giorni di cambio dell'ora.
  const giorniDiCalendario = Math.round(
    (inizio.getTime() - oggi.getTime()) / MILLISECONDI_AL_GIORNO,
  );

  if (giorniDiCalendario === 0) return 'oggi';
  if (giorniDiCalendario < 0) return 'passata';

  const minutiTrascorsiOggi = adesso.getHours() * 60 + adesso.getMinutes();
  // Un minuto appena iniziato non è ancora passato: si arrotonda per difetto.
  const secondiIniziati = adesso.getSeconds() > 0 || adesso.getMilliseconds() > 0 ? 1 : 0;
  const minuti =
    (giorniDiCalendario - 1) * MINUTI_AL_GIORNO +
    (MINUTI_AL_GIORNO - minutiTrascorsiOggi) -
    secondiIniziati;

  return {
    giorni: Math.floor(minuti / MINUTI_AL_GIORNO),
    ore: Math.floor((minuti % MINUTI_AL_GIORNO) / 60),
    minuti: minuti % 60,
  };
}

/** "Mancano 195 giorni, 3 ore e 12 minuti"; al singolare "Manca 1 giorno, 1 ora e 1 minuto". */
export function testoMancante({ giorni, ore, minuti }: Mancano): string {
  const parole = (n: number, singolare: string, plurale: string) =>
    `${n} ${n === 1 ? singolare : plurale}`;
  const verbo = giorni === 1 ? 'Manca' : 'Mancano';
  return `${verbo} ${parole(giorni, 'giorno', 'giorni')}, ${parole(ore, 'ora', 'ore')} e ${parole(minuti, 'minuto', 'minuti')}`;
}

/** Prima lettera maiuscola: "sabato 22 maggio 2027" → "Sabato 22 maggio 2027". */
export function maiuscola(testo: string): string {
  return testo.charAt(0).toUpperCase() + testo.slice(1);
}
