<script lang="ts">
  import '$lib/tema/tema.css';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import BarraNavigazione from '$lib/componenti/BarraNavigazione.svelte';
  import BannerAggiornamento from '$lib/componenti/BannerAggiornamento.svelte';
  import Caricamento from '$lib/componenti/Caricamento.svelte';
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
    {#key page.url.pathname}
      <div class="sezione">
        {@render children()}
      </div>
    {/key}
  {:else if decisione === 'attendi'}
    <Caricamento />
  {/if}
</main>

<BannerAggiornamento conBarra={barra} />
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

  /* Ogni sezione compare con una breve dissolvenza quando la apri (solo entrata, D-048). */
  .sezione {
    /* backwards: finita l'entrata l'animazione si toglie, e non fa da riferimento agli elementi fissi. */
    animation: entrata-sezione var(--durata-media) var(--curva-uscita) backwards;
  }
  @keyframes entrata-sezione {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  /* Da 900px in su (PC, D-047), solo con la barra laterale: il contenuto sta a destra della barra
     e la colonna è centrata nello spazio rimasto, larga al massimo --larghezza-contenuto-ampio.
     Senza barra (pagina d'ingresso) resta com'è: 560px. La soglia è sempre 900px. */
  @media (min-width: 900px) {
    main.con-barra {
      /* Colonna: al massimo 960px, e in ogni caso lo spazio a destra della barra. */
      --colonna: min(var(--larghezza-contenuto-ampio), 100% - var(--larghezza-barra-laterale));
      width: var(--colonna);
      max-width: none;
      margin-top: 0;
      margin-bottom: 0;
      margin-right: auto;
      /* Centrata nello spazio rimasto, a destra della barra. */
      margin-left: calc(
        var(--larghezza-barra-laterale) +
          (100% - var(--larghezza-barra-laterale) - var(--colonna)) / 2
      );
      padding-left: var(--spazio-5);
      padding-right: var(--spazio-5);
      padding-bottom: calc(var(--spazio-5) + env(safe-area-inset-bottom));
    }
  }
</style>
