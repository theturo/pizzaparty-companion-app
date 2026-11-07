<script lang="ts">
  import '$lib/tema/tema.css';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import BarraNavigazione from '$lib/componenti/BarraNavigazione.svelte';
  import BannerAggiornamento from '$lib/componenti/BannerAggiornamento.svelte';
  import { registraServiceWorker } from '$lib/pwa/aggiornamenti.svelte';
  import { avviaSessione, sessione } from '$lib/account/sessione.svelte';
  import { decisioneSu, mostraBarra } from '$lib/account/accesso';

  let { children } = $props();

  // Le sezioni riservate agli approvati non si vedono agli altri: si aspetta che lo stato sia noto,
  // poi chi non è approvato torna alla pagina d'ingresso (D-045).
  const decisione = $derived(decisioneSu(page.url.pathname, sessione));
  const barra = $derived(mostraBarra(sessione));

  $effect(() => {
    if (decisione === 'rimanda') void goto(resolve('/'), { replaceState: true });
  });

  onMount(() => {
    registraServiceWorker();
    avviaSessione();
  });
</script>

<main class:con-barra={barra}>
  {#if decisione === 'mostra'}
    {@render children()}
  {/if}
</main>

<BannerAggiornamento />
{#if barra}
  <BarraNavigazione />
{/if}

<style>
  main {
    max-width: var(--larghezza-contenuto);
    margin: 0 auto;
    /* Aree "sicure" degli schermi con notch; con la barra, spazio anche per lei. */
    padding: calc(var(--spazio-4) + env(safe-area-inset-top)) var(--spazio-4)
      calc(var(--spazio-5) + env(safe-area-inset-bottom));
  }
  main.con-barra {
    padding-bottom: calc(var(--altezza-barra) + var(--spazio-5) + env(safe-area-inset-bottom));
  }
</style>
