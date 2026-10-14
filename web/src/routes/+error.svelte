<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
</script>

<svelte:head>
  <title>Pagina non trovata · PizzaParty</title>
</svelte:head>

<section>
  <p class="etichetta">Errore {page.status}</p>
  <h1 class="titolo">Questa pizza non è nel menu.</h1>
  <p><a href={resolve('/')}>Torna alla Home</a></p>
</section>

<style>
  section {
    display: grid;
    gap: var(--spazio-2);
    padding-top: var(--spazio-5);
  }
</style>
