<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>Pagina non trovata · PizzaParty</title>
</svelte:head>

<section>
  <p class="etichetta">Errore {page.status}</p>
  <h1>Questa pizza non è nel menu.</h1>
  <p><a href="/">Torna alla Home</a></p>
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
  a {
    color: var(--gold);
  }
</style>
