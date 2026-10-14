<script lang="ts">
  // Barra in basso con le cinque sezioni dell'app.
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
</style>
