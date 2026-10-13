<script lang="ts">
  import '$lib/tema/tema.css';
  import { onMount } from 'svelte';
  import BarraNavigazione from '$lib/componenti/BarraNavigazione.svelte';
  import BannerAggiornamento from '$lib/componenti/BannerAggiornamento.svelte';
  import { registraServiceWorker } from '$lib/pwa/aggiornamenti.svelte';

  let { children } = $props();

  onMount(() => {
    registraServiceWorker();
  });
</script>

<main>
  {@render children()}
</main>

<BannerAggiornamento />
<BarraNavigazione />

<style>
  main {
    max-width: var(--larghezza-contenuto);
    margin: 0 auto;
    /* Spazio per la barra in basso e per le aree "sicure" degli schermi con notch. */
    padding: calc(var(--spazio-4) + env(safe-area-inset-top)) var(--spazio-4)
      calc(var(--altezza-barra) + var(--spazio-5) + env(safe-area-inset-bottom));
  }
</style>
