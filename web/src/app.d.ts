/// <reference types="@sveltejs/kit" />

declare global {
  /** Versione dell'app (package.json della radice, es. "0.2.0"). */
  const __VERSIONE__: string;
  /** Commit da cui è stata costruita la build (7 caratteri), o "locale". */
  const __COMMIT__: string;
  /** Data della build (AAAA-MM-GG). */
  const __DATA_BUILD__: string;
}

export {};
