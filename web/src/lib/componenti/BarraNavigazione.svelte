<script lang="ts">
  // Barra con le cinque sezioni dell'app: in basso sul telefono, a sinistra da 900px in su (PC, D-047).
  // Icone Lucide (licenza ISC): provvisorie, da sostituire con disegni a tema (vedi wiki).
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import { House, Trophy, Camera, Pizza, User } from '@lucide/svelte';

  const sezioni = [
    { href: '/', etichetta: 'Home', icona: House },
    { href: '/trofei', etichetta: 'Trofei', icona: Trophy },
    { href: '/pizzagram', etichetta: 'Pizzagram', icona: Camera },
    { href: '/ordina', etichetta: 'Ordina', icona: Pizza },
    { href: '/profilo', etichetta: 'Profilo', icona: User },
  ] as const;

  const attiva = (href: string) =>
    href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<nav aria-label="Sezioni">
  <!-- Solo su PC: nome in testa alla barra laterale, non un link. -->
  <p class="marchio">PizzaParty</p>
  {#each sezioni as { href, etichetta, icona: Icona } (href)}
    <a href={resolve(href)} aria-current={attiva(href) ? 'page' : undefined}>
      <Icona size={24} strokeWidth={attiva(href) ? 2.4 : 1.8} aria-hidden="true" />
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
  }
  a[aria-current='page'] {
    color: var(--colore-accento);
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
