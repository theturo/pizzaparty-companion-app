<script lang="ts">
  // Contenitore delle pagine di accesso, registrazione e profilo.
  import type { Snippet } from 'svelte';

  let {
    titolo,
    etichetta = 'Il tuo account',
    children,
  }: { titolo: string; etichetta?: string; children: Snippet } = $props();
</script>

<svelte:head>
  <title>{titolo} · PizzaParty</title>
</svelte:head>

<section>
  <p class="etichetta">{etichetta}</p>
  <h1 class="titolo">{titolo}</h1>
  {@render children()}
</section>

<style>
  section {
    display: grid;
    gap: var(--spazio-4);
    padding-top: var(--spazio-5);
  }
</style>
