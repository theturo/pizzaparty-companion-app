<script lang="ts">
  import Dinosauro from '$lib/componenti/Dinosauro.svelte';
  import Pellicola from '$lib/componenti/Pellicola.svelte';
</script>

<svelte:head>
  <title>PizzaParty</title>
  <meta name="description" content="L'app che accompagna il PizzaParty. In costruzione." />
</svelte:head>

<section>
  <p class="etichetta">Companion App</p>
  <h1 class="titolo">Il forno si sta scaldando.</h1>
  <p class="attenuato">
    Qui arriveranno il countdown alla prossima edizione e il check-in della serata. Ci vediamo in
    primavera.
  </p>
  <div class="mascotte">
    <Dinosauro larghezza={180} cappellino />
    <Pellicola />
  </div>
</section>

<style>
  section {
    min-height: 60dvh;
    display: grid;
    place-content: center;
    gap: var(--spazio-3);
    text-align: center;
  }
  .titolo {
    font-size: var(--testo-xxl);
  }
  .mascotte {
    display: grid;
    justify-items: center;
    margin-top: var(--spazio-5);
  }
  .mascotte :global(.pellicola) {
    width: 100%;
  }
</style>
