<script lang="ts">
  // Contenitore delle pagine di accesso e registrazione.
  // Finché gli account non sono attivi (produzione prima della fine del blocco 1) mostra "in arrivo".
  import type { Snippet } from 'svelte';
  import SezioneInArrivo from './SezioneInArrivo.svelte';

  let {
    titolo,
    etichetta = 'Il tuo account',
    children,
  }: { titolo: string; etichetta?: string; children: Snippet } = $props();
</script>

<svelte:head>
  <title>{titolo} · PizzaParty</title>
</svelte:head>

{#if __ACCOUNT_ATTIVI__}
  <section>
    <p class="etichetta">{etichetta}</p>
    <h1 class="titolo">{titolo}</h1>
    {@render children()}
  </section>
{:else}
  <SezioneInArrivo
    {titolo}
    descrizione="Gli account dell'app arriveranno insieme all'informativa privacy. Ci siamo quasi."
  />
{/if}

<style>
  section {
    display: grid;
    gap: var(--spazio-4);
    padding-top: var(--spazio-5);
  }
</style>
