<script lang="ts">
  // Pagina d'ingresso (D-045): la vede chi non ha ancora accesso alle sezioni, senza barra in basso.
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import Bottone from '$lib/componenti/Bottone.svelte';
  import Dinosauro from '$lib/componenti/Dinosauro.svelte';
  import Pellicola from '$lib/componenti/Pellicola.svelte';
  import type { FaseIngresso } from '$lib/account/accesso';
  import { VERSIONE, COMMIT } from '$lib/versione';
  import { appInstallata, descriviDispositivo } from '$lib/dispositivo';
  import { linkSegnalazione } from '$lib/segnalazione';

  let { fase }: { fase: FaseIngresso } = $props();

  interface Testi {
    etichetta: string;
    titolo: string;
    righe: string[];
  }

  // Chi non ha ancora fatto accesso e chi deve completare la registrazione leggono lo stesso testo.
  const OSPITE: Testi = {
    etichetta: 'PizzaParty',
    titolo: 'La serata comincia qui.',
    righe: [
      "L'app degli invitati del PizzaParty:",
      'check-in, trofei, foto e ordini della serata.',
    ],
  };

  const TESTI: Record<FaseIngresso, Testi> = {
    ospite: OSPITE,
    senza_profilo: OSPITE,
    errore: {
      etichetta: 'PizzaParty',
      titolo: 'Non riesco a caricare il tuo account.',
      righe: ['Controlla la connessione e riprova.'],
    },
    in_attesa: {
      etichetta: 'PizzaParty',
      titolo: "Sei in lista d'attesa.",
      righe: [
        'La Fondazione PizzaParty deve approvare il tuo account.',
        "Appena fatto, otterrai l'accesso all'app.",
      ],
    },
    sospeso: {
      etichetta: 'PizzaParty',
      titolo: 'Account sospeso.',
      righe: ['Per informazioni scrivi agli organizzatori.'],
    },
  };

  const testi = $derived(TESTI[fase]);

  // Il dispositivo si legge solo nel browser: la pagina è prerenderizzata.
  let dispositivo = $state<{ descrizione: string; installata: boolean } | null>(null);
  onMount(() => {
    dispositivo = { descrizione: descriviDispositivo(), installata: appInstallata() };
  });
  const segnalazione = $derived(
    linkSegnalazione({
      versione: VERSIONE,
      commit: COMMIT,
      dispositivo: dispositivo?.descrizione ?? 'sconosciuto',
      installata: dispositivo?.installata ?? false,
    }),
  );

  // Esce restando su questa pagina: dopo l'uscita la pagina mostra la versione "ospite".
  async function esci() {
    const { esci } = await import('$lib/account/azioni');
    await esci();
  }
</script>

<section>
  <Dinosauro larghezza={150} cappellino />
  <div class="testo">
    <p class="etichetta">{testi.etichetta}</p>
    <h1 class="titolo">{testi.titolo}</h1>
    <p class="attenuato">
      {#each testi.righe as riga, i (riga)}
        {#if i > 0}<br />{/if}{riga}
      {/each}
    </p>
  </div>

  <div class="azioni">
    {#if fase === 'ospite'}
      <a class="pulsante" href={resolve('/accedi')}>Accedi</a>
      <a class="pulsante secondario" href={resolve('/registrati')}>Registrati</a>
    {:else if fase === 'senza_profilo'}
      <a class="pulsante" href={resolve('/profilo')}>Completa la registrazione</a>
    {:else if fase === 'errore'}
      <Bottone onclick={() => location.reload()}>Riprova</Bottone>
      <Bottone variante="secondario" onclick={esci}>Esci</Bottone>
    {:else}
      <a class="pulsante" href={resolve('/profilo')}>Profilo</a>
      <Bottone variante="secondario" onclick={esci}>Esci</Bottone>
    {/if}
  </div>

  {#if fase === 'sospeso'}
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
    <a class="segnala" href={segnalazione}>Segnala un problema</a>
  {/if}

  <div class="mascotte">
    <Pellicola />
  </div>

  <footer class="legale">
    <a href={resolve('/informazioni')}>Informazioni</a>
    <a href={resolve('/privacy')}>Privacy</a>
  </footer>
</section>

<style>
  /* Centrata in verticale come la Home degli approvati. */
  section {
    min-height: 60dvh;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: var(--spazio-4);
    text-align: center;
    padding-bottom: var(--spazio-5);
  }
  .testo {
    display: grid;
    gap: var(--spazio-3);
    justify-items: center;
  }
  .titolo {
    font-size: var(--testo-xxl);
    text-wrap: balance;
    margin: 0;
  }
  p {
    margin: 0;
    text-wrap: pretty;
  }
  .azioni {
    display: grid;
    gap: var(--spazio-2);
    width: 100%;
    max-width: 20rem;
  }
  .azioni :global(button) {
    width: 100%;
  }
  .pulsante {
    display: block;
    box-sizing: border-box;
    width: 100%;
    background: var(--colore-accento);
    color: var(--colore-sul-accento);
    border-radius: var(--raggio-s);
    padding: var(--spazio-2) var(--spazio-4);
    font-weight: 700;
    text-decoration: none;
  }
  .pulsante.secondario {
    background: var(--colore-sfondo-2);
    color: var(--colore-testo);
    box-shadow: inset 0 0 0 1px var(--colore-accento-scuro);
  }
  .segnala {
    color: var(--colore-accento);
  }
  .mascotte {
    width: 100%;
    max-width: 20rem;
  }
  .mascotte :global(.pellicola) {
    width: 100%;
  }
  .legale {
    display: flex;
    gap: var(--spazio-4);
    justify-content: center;
    flex-wrap: wrap;
    font-size: var(--testo-s);
  }
  .legale a {
    color: var(--colore-testo-attenuato);
  }
  a:focus-visible {
    outline: 2px solid var(--colore-accento);
    outline-offset: 2px;
  }
</style>
