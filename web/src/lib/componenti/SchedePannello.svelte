<script lang="ts">
  // Schede del pannello admin: Richieste, Edizioni e Gestione pagamenti (D-054).
  // Le pagine restano separate: ogni scheda è un link vero, così funzionano anche senza script.
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
</script>

<nav aria-label="Sezioni del pannello" class="schede">
  <a href={resolve('/admin')} aria-current={page.url.pathname === '/admin' ? 'page' : undefined}>
    Richieste
  </a>
  <a
    href={resolve('/admin/edizioni')}
    aria-current={page.url.pathname.startsWith('/admin/edizioni') ? 'page' : undefined}
  >
    Edizioni
  </a>
  <a
    href={resolve('/admin/pagamenti')}
    aria-current={page.url.pathname.startsWith('/admin/pagamenti') ? 'page' : undefined}
  >
    Gestione pagamenti
  </a>
</nav>

<style>
  .schede {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spazio-2);
  }
  a {
    border-radius: var(--raggio-s);
    padding: var(--spazio-2) var(--spazio-3);
    background: var(--colore-sfondo-2);
    color: var(--colore-testo);
    box-shadow: inset 0 0 0 1px var(--colore-accento-scuro);
    font-weight: 700;
    font-size: var(--testo-s);
    text-decoration: none;
    transition: filter var(--durata-breve);
  }
  a:hover {
    filter: brightness(1.08);
  }
  a[aria-current='page'] {
    background: var(--colore-accento);
    color: var(--colore-sul-accento);
    box-shadow: none;
  }
</style>
