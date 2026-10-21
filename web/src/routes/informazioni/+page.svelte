<script lang="ts">
  import { onMount } from 'svelte';
  import { VERSIONE, COMMIT, DATA_BUILD, leggiChangelog } from '$lib/versione';
  import Scheda from '$lib/componenti/Scheda.svelte';
  import { sessione } from '$lib/account/sessione.svelte';
  import { appInstallata, descriviDispositivo } from '$lib/dispositivo';
  import { linkSegnalazione } from '$lib/segnalazione';

  const rilasci = leggiChangelog();
  const urlCommit = `https://github.com/theturo/pizzaparty-companion-app/commit/${COMMIT}`;

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
      uid: sessione.utente?.uid,
    }),
  );
</script>

<svelte:head>
  <title>Informazioni · PizzaParty</title>
</svelte:head>

<section>
  <p class="etichetta">L'app</p>
  <h1 class="titolo">Informazioni</h1>

  <Scheda>
    <p>Versione <strong>{VERSIONE}</strong></p>
    <p class="attenuato">
      Build del {DATA_BUILD} ·
      {#if COMMIT === 'locale'}
        copia locale
      {:else}
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
        <a href={urlCommit} rel="external noopener">commit {COMMIT}</a>
      {/if}
    </p>
  </Scheda>

  <Scheda>
    <p>Qualcosa non funziona?</p>
    <p class="attenuato">
      Si apre una mail già pronta con la versione dell'app, il tipo di dispositivo e, se hai fatto
      accesso, il codice del tuo account: tu aggiungi solo cosa è successo.
    </p>
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
    <a class="bottone" href={segnalazione}>Segnala un problema</a>
  </Scheda>

  <h2 class="etichetta">Novità</h2>
  {#each rilasci as rilascio (rilascio.versione)}
    <article>
      <h3>{rilascio.versione} <span class="attenuato">· {rilascio.data}</span></h3>
      <ul>
        {#each rilascio.novita as voce (voce)}
          <li>{voce}</li>
        {/each}
      </ul>
    </article>
  {/each}
</section>

<style>
  section {
    display: grid;
    gap: var(--spazio-4);
    padding-top: var(--spazio-5);
  }
  section :global(.scheda p) {
    margin: 0;
  }
  /* Link con l'aspetto del pulsante principale (Bottone.svelte). */
  .bottone {
    justify-self: start;
    border-radius: var(--raggio-s);
    padding: var(--spazio-2) var(--spazio-4);
    font-weight: 700;
    text-decoration: none;
    background: var(--colore-accento);
    color: var(--colore-sul-accento);
    transition: filter var(--durata-breve);
  }
  .bottone:hover {
    filter: brightness(1.08);
  }
  h2 {
    font-size: var(--testo-l);
    margin-top: var(--spazio-3);
  }
  h3 {
    margin: 0 0 var(--spazio-2);
    font-size: var(--testo-m);
  }
  h3 .attenuato {
    font-weight: 400;
  }
  ul {
    margin: 0;
    padding-left: var(--spazio-5);
    display: grid;
    gap: var(--spazio-1);
  }
</style>
