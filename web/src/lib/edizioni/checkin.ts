// Finestra del check-in e presenze (D-058, D-059): funzioni pure, senza Firebase né DOM.
// La logica è la stessa di functions/src/checkin.ts (i due workspace sono separati): cambiarne una
// vuol dire cambiare anche l'altra, e i test di entrambi devono restare uguali.
import { orariDi, type Quando } from './edizione';

const FUSO = 'Europe/Rome';
/** Il check-in si apre questi minuti prima dell'inizio dell'edizione. */
const MINUTI_PRIMA_DELL_INIZIO = 30;
/** Il check-in si chiude alle 03:00 del giorno dopo (27 ore dal giorno della festa). */
const ORE_CHIUSURA = 27;
const DATA = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

export interface FinestraCheckin {
  apertura: Date;
  chiusura: Date;
}

/** Offset di Roma rispetto a UTC, in millisecondi, a un dato istante (ora legale inclusa). */
export function offsetRoma(istante: Date): number {
  const parti = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(istante);
  const v = (tipo: string) => Number(parti.find((p) => p.type === tipo)?.value);
  const comeUtc = Date.UTC(
    v('year'),
    v('month') - 1,
    v('day'),
    v('hour'),
    v('minute'),
    v('second'),
  );
  return comeUtc - (istante.getTime() - istante.getMilliseconds());
}

/**
 * Istante reale di un orario a muro di Roma. `minutiDaMezzanotte` può essere negativo
 * (il giorno prima) o superiore a 1440 (il giorno dopo).
 */
export function istanteRoma(data: string, minutiDaMezzanotte: number): Date {
  const [anno, mese, giorno] = data.split('-').map(Number);
  const aMuro = Date.UTC(anno, mese - 1, giorno, 0, minutiDaMezzanotte);
  // Due passaggi: il primo può sbagliare di un'ora vicino al cambio dell'ora.
  const primo = aMuro - offsetRoma(new Date(aMuro));
  return new Date(aMuro - offsetRoma(new Date(primo)));
}

/** Apertura (inizio − 30 minuti) e chiusura (03:00 del giorno dopo), in ora di Roma. */
export function finestraCheckin(data: string, inizio: string): FinestraCheckin {
  const [ore, minuti] = inizio.split(':').map(Number);
  return {
    apertura: istanteRoma(data, ore * 60 + minuti - MINUTI_PRIMA_DELL_INIZIO),
    chiusura: istanteRoma(data, ORE_CHIUSURA * 60),
  };
}

/** "19:00": l'ora di Roma di un istante. */
export function oraRoma(istante: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(istante);
}

/** Vero se l'edizione è annunciata, con data esatta, e il check-in è aperto ad `adesso`. */
export function eAperto(edizione: { stato: string; quando: Quando }, adesso: Date): boolean {
  if (edizione.stato !== 'annunciata' || edizione.quando.tipo !== 'data') return false;
  const { data } = edizione.quando;
  if (!DATA.test(data)) return false;
  const { inizio } = orariDi(edizione.quando);
  const { apertura, chiusura } = finestraCheckin(data, inizio);
  return adesso >= apertura && adesso < chiusura;
}
