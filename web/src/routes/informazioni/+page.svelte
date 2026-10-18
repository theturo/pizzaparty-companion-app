<script lang="ts">
  import { VERSIONE, COMMIT, DATA_BUILD, leggiChangelog } from '$lib/versione';
  import Scheda from '$lib/componenti/Scheda.svelte';

  const rilasci = leggiChangelog();
  const urlCommit = `https://github.com/theturo/pizzaparty-companion-app/commit/${COMMIT}`;
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
    <p class="attenuato">
      Se qualcosa non funziona, scrivi la versione e il commit nella segnalazione.
    </p>
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
