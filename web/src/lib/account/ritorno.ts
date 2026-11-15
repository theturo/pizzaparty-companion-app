// Dove mandare chi ha appena fatto accesso, quando la pagina di partenza lo ha chiesto (D-059).

/**
 * Il valore del parametro `ritorno`, se è un percorso interno all'app. Vale solo se inizia con "/"
 * e non con "//" (né con "/\", che alcuni browser leggono come "//"); altrimenti la Home.
 */
export function percorsoDiRitorno(valore: string): string {
  if (!valore.startsWith('/') || valore.startsWith('//') || valore.includes('\\')) return '/';
  return valore;
}
