// Dove mandare chi ha appena fatto accesso, quando la pagina di partenza lo ha chiesto (D-059).

const BASE_FITTIZIA = 'http://x.invalid';

/**
 * Il valore del parametro `ritorno`, se è un percorso interno all'app; altrimenti la Home.
 * Il valore si legge con il parser URL (come fa il browser): così tab, a capo e barre rovesciate
 * non possono trasformare "/\t/evil.com" in un indirizzo di un altro sito.
 */
export function percorsoDiRitorno(valore: string): string {
  if (!valore.startsWith('/')) return '/';
  const url = new URL(valore, BASE_FITTIZIA);
  if (url.origin !== BASE_FITTIZIA) return '/';
  return url.pathname + url.search + url.hash;
}
