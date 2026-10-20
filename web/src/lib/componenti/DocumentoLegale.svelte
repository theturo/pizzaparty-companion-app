<script lang="ts">
  import type { Snippet } from 'svelte';
  import { VERSIONE, DATA_VERSIONE } from '$lib/legale';

  let { titolo, children }: { titolo: string; children: Snippet } = $props();
</script>

<svelte:head>
  <title>{titolo} · PizzaParty</title>
</svelte:head>

<article>
  <p class="etichetta">PizzaParty Companion App</p>
  <h1 class="titolo">{titolo}</h1>
  <p class="attenuato">Versione {VERSIONE}, in vigore dal {DATA_VERSIONE}.</p>
  {@render children()}
</article>

<style>
  article {
    display: grid;
    gap: var(--spazio-3);
    padding-top: var(--spazio-5);
    line-height: 1.6;
  }
  article :global(h2) {
    font-family: var(--font-etichette);
    font-weight: var(--etichette-peso);
    color: var(--colore-accento);
    font-size: var(--testo-l);
    margin: var(--spazio-4) 0 0;
  }
  article :global(p),
  article :global(ul) {
    margin: 0;
  }
  article :global(ul) {
    padding-left: var(--spazio-5);
    display: grid;
    gap: var(--spazio-1);
  }
</style>
