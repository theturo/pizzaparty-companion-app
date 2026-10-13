<script lang="ts">
  import '../app.css';
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
    max-width: 560px;
    margin: 0 auto;
    /* Spazio per la barra in basso e per le aree "sicure" degli schermi con notch. */
    padding: calc(16px + env(safe-area-inset-top)) 16px calc(88px + env(safe-area-inset-bottom));
  }
</style>
