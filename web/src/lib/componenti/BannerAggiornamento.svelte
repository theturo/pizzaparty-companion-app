<script lang="ts">
  import { fly } from 'svelte/transition';
  import Bottone from './Bottone.svelte';
  import { pwa, aggiorna } from '$lib/pwa/aggiornamenti.svelte';

  // Con la barra laterale (PC, D-047) il banner sta a destra di lei.
  let { conBarra = false }: { conBarra?: boolean } = $props();
</script>

{#if pwa.nuovaVersione}
  <div
    class="banner"
    class:con-barra={conBarra}
    role="status"
    transition:fly={{ y: 24, duration: 250 }}
  >
    <span>È disponibile una nuova versione.</span>
    <Bottone onclick={aggiorna}>Aggiorna</Bottone>
  </div>
{/if}

<style>
  .banner {
    position: fixed;
    left: var(--spazio-3);
    right: var(--spazio-3);
    bottom: calc(var(--altezza-barra) + var(--spazio-2) + env(safe-area-inset-bottom));
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spazio-3);
    padding: var(--spazio-2) var(--spazio-3) var(--spazio-2) var(--spazio-4);
    background: var(--colore-superficie);
    border: 1px solid var(--colore-accento-scuro);
    border-radius: var(--raggio-m);
    z-index: 20;
  }

  /* Da 900px in su (PC, D-047): in basso, centrato nello spazio del contenuto, senza coprire la barra
     laterale. La soglia è sempre 900px. */
  @media (min-width: 900px) {
    .banner {
      bottom: calc(var(--spazio-4) + env(safe-area-inset-bottom));
      max-width: var(--larghezza-contenuto-ampio);
      margin-inline: auto;
    }
    .banner.con-barra {
      left: calc(var(--larghezza-barra-laterale) + var(--spazio-3));
    }
  }
</style>
