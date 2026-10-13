// Registro dei temi: per aggiungerne uno si crea temi/<id>.css, lo si importa in tema.css
// e lo si elenca qui. L'edizione su Firestore indicherà solo l'id (D-023).

export const TEMI = [
  {
    id: 'pizzaparty-2026',
    nome: 'PizzaParty 2026',
    descrizione: 'Il decennale: forno a legna, oro e pellicola cinematografica.',
  },
  {
    id: 'prova-odissea',
    nome: 'Prova · Odissea',
    descrizione: 'Tema di prova, volutamente diverso, per verificare il sistema grafico.',
  },
] as const;

export type IdTema = (typeof TEMI)[number]['id'];

export const TEMA_PREDEFINITO: IdTema = 'pizzaparty-2026';

/** Applica un tema a tutta l'app e allinea il colore della barra del browser. */
export function applicaTema(id: IdTema): void {
  const radice = document.documentElement;
  radice.dataset.tema = id;
  const sfondo = getComputedStyle(radice).getPropertyValue('--colore-sfondo').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', sfondo);
}
