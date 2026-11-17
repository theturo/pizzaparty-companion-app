// Statistiche di partecipazione (blocco 3.4, D-062, D-072): funzioni pure, calcolate nel browser
// dalle presenze. Una persona è un account (chiave = uid) oppure un segnaposto (chiave = "s:" + id).
// Le presenze di edizioni senza data o inesistenti si ignorano.

const DATA = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
const PREFISSO_SEGNAPOSTO = 's:';

/** La chiave di una persona senza account, dal suo segnaposto. */
export const chiaveSegnaposto = (id: string): string => `${PREFISSO_SEGNAPOSTO}${id}`;
/** Vero se la chiave è quella di una persona senza account. */
export const eSegnaposto = (chiave: string): boolean => chiave.startsWith(PREFISSO_SEGNAPOSTO);

export interface PresenzaStatistica {
  edizione: string;
  chiave: string;
  nome?: string;
}

export interface EdizioneStatistica {
  id: string;
  nome: string;
  /** AAAA-MM-GG; senza data l'edizione non entra nelle statistiche. */
  data?: string | null;
}

export interface StatisticaEdizione {
  id: string;
  nome: string;
  data: string;
  presenti: number;
  account: number;
  senzaAccount: number;
  /** Persone alla prima presenza in assoluto (la data più vecchia tra tutte le loro edizioni). */
  nuoveLeve: number;
}

export interface Fedelissimo {
  chiave: string;
  nome: string;
  presenze: number;
}

export interface Statistiche {
  /** Dalla più recente alla più vecchia. */
  perEdizione: StatisticaEdizione[];
  /** Più presenze prima; a parità, per nome. */
  fedelissimi: Fedelissimo[];
}

/** Le edizioni con una data valida, per id. */
function edizioniDatate(
  edizioni: EdizioneStatistica[],
): Map<string, EdizioneStatistica & { data: string }> {
  const mappa = new Map<string, EdizioneStatistica & { data: string }>();
  for (const e of edizioni) {
    if (e.data && DATA.test(e.data)) mappa.set(e.id, { ...e, data: e.data });
  }
  return mappa;
}

/** Le presenze uniche (una per persona ed edizione) di edizioni con data. */
function presenzeUniche(
  presenze: PresenzaStatistica[],
  datate: Map<string, unknown>,
): PresenzaStatistica[] {
  const viste = new Set<string>();
  const uniche: PresenzaStatistica[] = [];
  for (const p of presenze) {
    if (!datate.has(p.edizione)) continue;
    const chiave = `${p.edizione}\n${p.chiave}`;
    if (viste.has(chiave)) continue;
    viste.add(chiave);
    uniche.push(p);
  }
  return uniche;
}

/** Calcola panoramica per edizione, nuove leve e fedelissimi. */
export function calcolaStatistiche(
  presenze: PresenzaStatistica[],
  edizioni: EdizioneStatistica[],
): Statistiche {
  const datate = edizioniDatate(edizioni);
  const uniche = presenzeUniche(presenze, datate);

  // La prima presenza in assoluto di ogni persona: la data più vecchia tra le sue edizioni.
  const primaDi = new Map<string, string>();
  const nomi = new Map<string, string>();
  const numero = new Map<string, number>();
  for (const p of uniche) {
    const data = datate.get(p.edizione)?.data ?? '';
    const prima = primaDi.get(p.chiave);
    if (prima === undefined || data < prima) primaDi.set(p.chiave, data);
    if (p.nome && !nomi.has(p.chiave)) nomi.set(p.chiave, p.nome);
    numero.set(p.chiave, (numero.get(p.chiave) ?? 0) + 1);
  }

  const perEdizione = new Map<string, StatisticaEdizione>();
  for (const e of datate.values()) {
    perEdizione.set(e.id, {
      id: e.id,
      nome: e.nome,
      data: e.data,
      presenti: 0,
      account: 0,
      senzaAccount: 0,
      nuoveLeve: 0,
    });
  }
  for (const p of uniche) {
    const riga = perEdizione.get(p.edizione);
    if (!riga) continue;
    riga.presenti += 1;
    if (eSegnaposto(p.chiave)) riga.senzaAccount += 1;
    else riga.account += 1;
    if (primaDi.get(p.chiave) === riga.data) riga.nuoveLeve += 1;
  }

  const fedelissimi: Fedelissimo[] = [...numero.entries()].map(([chiave, presenze]) => ({
    chiave,
    nome: nomi.get(chiave) ?? '',
    presenze,
  }));
  fedelissimi.sort((a, b) => b.presenze - a.presenze || a.nome.localeCompare(b.nome, 'it'));

  return {
    perEdizione: [...perEdizione.values()].sort((a, b) =>
      a.data < b.data ? 1 : a.data > b.data ? -1 : 0,
    ),
    fedelissimi,
  };
}

/** Le edizioni a cui una persona ha partecipato, dalla più recente: per il profilo (D-072). */
export function presenzeDellaPersona(
  presenze: { edizione: string }[],
  edizioni: EdizioneStatistica[],
): { id: string; nome: string; data: string }[] {
  const datate = edizioniDatate(edizioni);
  const viste = new Set<string>();
  const elenco: { id: string; nome: string; data: string }[] = [];
  for (const p of presenze) {
    const e = datate.get(p.edizione);
    if (!e || viste.has(e.id)) continue;
    viste.add(e.id);
    elenco.push({ id: e.id, nome: e.nome, data: e.data });
  }
  return elenco.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
}
