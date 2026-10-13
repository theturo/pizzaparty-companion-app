<script lang="ts">
  // Segnaposto per le sezioni non ancora costruite.
  let { titolo, descrizione }: { titolo: string; descrizione: string } = $props();
</script>

<svelte:head>
  <title>{titolo} · PizzaParty</title>
</svelte:head>

<section>
  <p class="etichetta">In arrivo</p>
  <h1 class="titolo">{titolo}</h1>
  <p class="attenuato">{descrizione}</p>
</section>

<style>
  section {
    display: grid;
    gap: var(--spazio-2);
    padding-top: var(--spazio-5);
  }
</style>
