<script lang="ts">
  // Segnaposto per le sezioni non ancora costruite.
  let { titolo, descrizione }: { titolo: string; descrizione: string } = $props();
</script>

<svelte:head>
  <title>{titolo} · PizzaParty</title>
</svelte:head>

<section>
  <p class="etichetta">In arrivo</p>
  <h1>{titolo}</h1>
  <p>{descrizione}</p>
</section>

<style>
  section {
    display: grid;
    gap: 8px;
    padding-top: 24px;
  }
  .etichetta {
    margin: 0;
    font-family: 'Kalam', cursive;
    font-weight: 700;
    color: var(--gold);
  }
  h1 {
    margin: 0;
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-weight: 800;
    font-size: 2.2rem;
  }
  p {
    margin: 0;
    color: var(--parchment-dim);
  }
</style>
