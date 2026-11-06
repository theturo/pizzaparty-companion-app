<script lang="ts">
  import Dinosauro from '$lib/componenti/Dinosauro.svelte';
  import Pellicola from '$lib/componenti/Pellicola.svelte';
  import PaginaIngresso from '$lib/componenti/PaginaIngresso.svelte';
  import { faseAccesso } from '$lib/account/accesso';
  import { sessione } from '$lib/account/sessione.svelte';

  // Chi non è approvato vede la pagina d'ingresso (D-045); finché lo stato non è noto, nulla.
  const fase = $derived(faseAccesso(sessione));
</script>

<svelte:head>
  <title>PizzaParty</title>
  <meta name="description" content="L'app che accompagna il PizzaParty. In costruzione." />
</svelte:head>

{#if fase === 'approvato'}
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
{:else if fase !== 'caricamento'}
  <PaginaIngresso {fase} />
{/if}

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
