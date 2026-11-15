// Modello delle edizioni del PizzaParty (D-053): i campi e i limiti devono restare allineati
// con firebase/firestore.rules (un test controlla i limiti principali).

export type StatoEdizione = 'bozza' | 'annunciata' | 'conclusa' | 'annullata';

/**
 * Quando si svolge. Con la data esatta ci sono anche gli orari 'HH:MM' (D-058); sono facoltativi
 * per le edizioni salvate prima, e in quel caso valgono i predefiniti (vedi orariDi).
 * `fine` può essere prima di `inizio`: vuol dire dopo mezzanotte.
 */
export type Quando =
  | { tipo: 'data'; data: string; inizio?: string; fine?: string }
  | { tipo: 'periodo'; periodo: string };

export const ORARI_PREDEFINITI = { inizio: '19:30', fine: '23:30' } as const;
export const ORARIO_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

/** Gli orari dell'edizione con i predefiniti al posto di quelli mancanti. */
export function orariDi(quando: { inizio?: string; fine?: string }): {
  inizio: string;
  fine: string;
} {
  return {
    inizio: quando.inizio ?? ORARI_PREDEFINITI.inizio,
    fine: quando.fine ?? ORARI_PREDEFINITI.fine,
  };
}

export interface DatiEdizione {
  nome: string;
  quando: Quando;
  tema: string;
  quota: { singolo: number; conAccompagnatore: number };
  pagamenti: { paypal: boolean; satispay: boolean; contanti: boolean };
  stato: StatoEdizione;
}

/** Come arriva da Firestore: anche i timestamp del server. */
export interface Edizione extends DatiEdizione {
  creato: unknown;
  aggiornato: unknown;
}

export type CampoEdizione = 'nome' | 'giorno' | 'orario' | 'periodo' | 'quota';

export interface ErroreEdizione {
  campo: CampoEdizione;
  messaggio: string;
}

export const NOME_EDIZIONE_MIN = 2;
export const NOME_EDIZIONE_MAX = 60;
export const PERIODO_MAX = 40;
export const QUOTA_MAX = 100;
export const LINK_MAX = 300;

export const ETICHETTE_STATO: Record<StatoEdizione, string> = {
  bozza: 'Bozza',
  annunciata: 'Annunciata',
  conclusa: 'Conclusa',
  annullata: 'Annullata',
};

const DATA_ISO = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

/** Vero se la stringa è una data reale AAAA-MM-GG (anche 2027-02-30 viene rifiutata). */
export function eDataValida(data: string): boolean {
  if (!DATA_ISO.test(data)) return false;
  const [anno, mese, giorno] = data.split('-').map(Number);
  const d = new Date(anno, mese - 1, giorno);
  return d.getFullYear() === anno && d.getMonth() === mese - 1 && d.getDate() === giorno;
}

/** Valori con cui si apre il modulo di una nuova edizione. */
export function valoriIniziali(tema: string): DatiEdizione {
  return {
    nome: '',
    quando: { tipo: 'periodo', periodo: '' },
    tema,
    quota: { singolo: 5, conAccompagnatore: 10 },
    pagamenti: { paypal: true, satispay: true, contanti: true },
    stato: 'bozza',
  };
}

/**
 * Controlla i dati di un'edizione e restituisce gli errori (vuoto = tutto a posto).
 * Il nome va già senza spazi ai bordi (lo fa il modulo prima di chiamare questa funzione).
 */
export function validaEdizione(dati: DatiEdizione): ErroreEdizione[] {
  const errori: ErroreEdizione[] = [];
  const nome = dati.nome;

  if (nome.length < NOME_EDIZIONE_MIN) {
    errori.push({ campo: 'nome', messaggio: 'Scrivi un nome di almeno 2 caratteri.' });
  } else if (nome.length > NOME_EDIZIONE_MAX) {
    errori.push({
      campo: 'nome',
      messaggio: `Il nome può essere lungo al massimo ${NOME_EDIZIONE_MAX} caratteri.`,
    });
  }

  const quando = dati.quando;
  if (quando.tipo === 'data') {
    if (!eDataValida(quando.data)) {
      errori.push({ campo: 'giorno', messaggio: 'Scegli il giorno.' });
    }
    const orari = orariDi(quando);
    if (!ORARIO_RE.test(orari.inizio) || !ORARIO_RE.test(orari.fine)) {
      errori.push({
        campo: 'orario',
        messaggio: 'Scrivi gli orari come HH:MM, per esempio 19:30.',
      });
    }
  } else {
    const periodo = quando.periodo;
    if (periodo.length < 2) {
      errori.push({
        campo: 'periodo',
        messaggio: 'Scrivi il periodo, per esempio Maggio 2027.',
      });
    } else if (periodo.length > PERIODO_MAX) {
      errori.push({
        campo: 'periodo',
        messaggio: `Il periodo può essere lungo al massimo ${PERIODO_MAX} caratteri.`,
      });
    }
  }

  const quotaValida = (n: number) => Number.isInteger(n) && n >= 0 && n <= QUOTA_MAX;
  if (!quotaValida(dati.quota.singolo) || !quotaValida(dati.quota.conAccompagnatore)) {
    errori.push({ campo: 'quota', messaggio: 'La quota è un numero intero da 0 a 100.' });
  }

  return errori;
}

/** "sabato 22 maggio 2027" per la data esatta; il periodo com'è scritto. */
export function descriviQuando(quando: Quando): string {
  if (quando.tipo === 'periodo') return quando.periodo;
  if (!eDataValida(quando.data)) return quando.data;
  const [anno, mese, giorno] = quando.data.split('-').map(Number);
  // Data locale (niente UTC): altrimenti il giorno può scivolare di uno.
  return new Date(anno, mese - 1, giorno).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Link di pagamento (D-055): vuoto oppure https://, con il limite di lunghezza.
 * Restituisce il messaggio d'errore, oppure null se va bene.
 */
export function validaLink(link: string): string | null {
  if (link === '') return null;
  if (!link.startsWith('https://') || link.length <= 'https://'.length) {
    return 'Il link deve iniziare con https://';
  }
  if (link.length > LINK_MAX) return `Il link può essere lungo al massimo ${LINK_MAX} caratteri.`;
  return null;
}
