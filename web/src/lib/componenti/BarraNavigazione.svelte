<script lang="ts">
  // Barra con le cinque sezioni dell'app: in basso sul telefono, a sinistra da 900px in su (PC, D-047).
  // Icone disegnate per il PizzaParty (vedi IconaBarra).
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import IconaBarra from './IconaBarra.svelte';

  const sezioni = [
    { href: '/', etichetta: 'Home', icona: 'forno' },
    { href: '/trofei', etichetta: 'Trofei', icona: 'trofeo' },
    { href: '/pizzagram', etichetta: 'Pizzagram', icona: 'fotocamera' },
    { href: '/ordina', etichetta: 'Ordina', icona: 'fetta' },
    { href: '/profilo', etichetta: 'Profilo', icona: 'profilo' },
  ] as const;

  const attiva = (href: string) =>
    href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<nav aria-label="Sezioni">
  <!-- Solo su PC: nome in testa alla barra laterale, non un link. -->
  <p class="marchio">PizzaParty</p>
  {#each sezioni as { href, etichetta, icona } (href)}
    <a href={resolve(href)} aria-current={attiva(href) ? 'page' : undefined}>
      <IconaBarra nome={icona} spessore={attiva(href) ? 2.4 : 1.8} />
      <span>{etichetta}</span>
    </a>
  {/each}
</nav>

<style>
  nav {
    position: fixed;
    inset: auto 0 0 0;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    min-height: var(--altezza-barra);
    background: var(--colore-sfondo-2);
    border-top: 1px solid var(--colore-superficie);
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 10;
  }
  a {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: var(--spazio-2) 0 6px;
    color: var(--colore-testo-attenuato);
    text-decoration: none;
    font-size: 0.7rem;
    transition:
      transform var(--durata-breve) var(--curva-uscita),
      color var(--durata-breve),
      background-color var(--durata-breve);
  }
  /* Al tocco la voce si schiaccia un poco (D-048). */
  a:active {
    transform: scale(0.94);
  }
  a[aria-current='page'] {
    color: var(--colore-accento);
  }
  /* Sul PC il mouse illumina la voce; la voce attiva resta del colore d'accento (D-048). */
  @media (hover: hover) {
    a:hover {
      color: var(--colore-testo);
      background-color: var(--colore-superficie);
    }
    a[aria-current='page']:hover {
      color: var(--colore-accento);
    }
  }
  a:focus-visible {
    outline: 2px solid var(--colore-accento);
    outline-offset: -4px;
    border-radius: var(--raggio-s);
  }
  .marchio {
    display: none;
  }

  /* Da 900px in su (PC, D-047): barra fissa a sinistra, a tutta altezza. La soglia è sempre 900px. */
  @media (min-width: 900px) {
    nav {
      inset: 0 auto 0 0;
      width: var(--larghezza-barra-laterale);
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: var(--spazio-1);
      background: var(--colore-sfondo-2);
      border-top: none;
      border-right: 1px solid var(--colore-superficie);
      padding: calc(var(--spazio-5) + env(safe-area-inset-top)) var(--spazio-3)
        calc(var(--spazio-4) + env(safe-area-inset-bottom))
        calc(var(--spazio-3) + env(safe-area-inset-left));
    }
    .marchio {
      display: block;
      margin: 0 0 var(--spazio-5);
      padding: 0 var(--spazio-3);
      font-family: var(--font-titoli);
      font-style: var(--titoli-stile);
      font-weight: var(--titoli-peso);
      text-transform: var(--titoli-maiuscolo);
      letter-spacing: var(--titoli-spaziatura);
      font-size: var(--testo-l);
      line-height: 1.1;
      color: var(--colore-accento);
    }
    a {
      flex-direction: row;
      justify-content: flex-start;
      gap: var(--spazio-3);
      padding: var(--spazio-3);
      border-radius: var(--raggio-s);
      font-size: var(--testo-m);
    }
    a:focus-visible {
      outline-offset: -2px;
    }
  }
</style>
