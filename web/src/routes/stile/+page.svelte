<script lang="ts">
  // Vetrina del sistema grafico: tutti gli elementi con il tema scelto.
  // Serve per rivedere i temi (sessione grafica, PR dei temi); non è nella barra di navigazione.
  import { onDestroy } from 'svelte';
  import { resolve } from '$app/paths';
  import { TEMI, TEMA_PREDEFINITO, applicaTema, type IdTema } from '$lib/tema/temi';
  import Bottone from '$lib/componenti/Bottone.svelte';
  import Scheda from '$lib/componenti/Scheda.svelte';
  import Pellicola from '$lib/componenti/Pellicola.svelte';
  import Dinosauro from '$lib/componenti/Dinosauro.svelte';

  let scelto = $state<IdTema>(TEMA_PREDEFINITO);
  $effect(() => applicaTema(scelto));
  // Uscendo dalla vetrina si torna al tema predefinito.
  onDestroy(() => {
    if (typeof document !== 'undefined') applicaTema(TEMA_PREDEFINITO);
  });

  const colori = [
    'sfondo',
    'sfondo-2',
    'superficie',
    'campo',
    'testo',
    'testo-attenuato',
    'accento',
    'accento-scuro',
    'secondario',
    'conferma',
    'evidenza',
  ];
</script>

<svelte:head>
  <title>Stile · PizzaParty</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="vetrina">
  <header>
    <p class="etichetta">Sistema grafico</p>
    <h1 class="titolo">Vetrina dei temi</h1>
    <div class="selettore" role="radiogroup" aria-label="Tema">
      {#each TEMI as tema (tema.id)}
        <Bottone
          variante={scelto === tema.id ? 'primario' : 'secondario'}
          role="radio"
          aria-checked={scelto === tema.id}
          onclick={() => (scelto = tema.id)}
        >
          {tema.nome}
        </Bottone>
      {/each}
    </div>
    <p class="attenuato">{TEMI.find((t) => t.id === scelto)?.descrizione}</p>
  </header>

  <section>
    <h2 class="etichetta">Colori</h2>
    <ul class="campioni">
      {#each colori as nome (nome)}
        <li>
          <span class="campione c-{nome}"></span>
          <code>--colore-{nome}</code>
        </li>
      {/each}
    </ul>
  </section>

  <section>
    <h2 class="etichetta">Tipografia</h2>
    <p class="titolo">Titolo dell'edizione</p>
    <p class="etichetta">Etichetta · scena 1</p>
    <p>Testo corrente: le informazioni della serata, gli ordini, i trofei.</p>
    <p class="attenuato">Testo attenuato, per le note secondarie.</p>
  </section>

  <section>
    <h2 class="etichetta">Elementi</h2>
    <div class="riga">
      <Bottone>Ordina</Bottone>
      <Bottone variante="secondario">Annulla</Bottone>
      <Bottone disabled>Esaurito</Bottone>
    </div>
    <Scheda>
      <p class="etichetta">Scheda</p>
      <p>
        Contenitore per ordini, trofei e informazioni. <a href={resolve('/stile')}
          >Un collegamento</a
        >.
      </p>
    </Scheda>
  </section>

  <section>
    <h2 class="etichetta">Pellicola</h2>
    <p class="attenuato">Il tema può mostrarla o nasconderla.</p>
    <Pellicola />
  </section>

  <section>
    <h2 class="etichetta">Mascotte (segnaposto)</h2>
    <div class="riga">
      <Dinosauro larghezza={140} />
      <Dinosauro larghezza={140} verso="destra" cappellino />
    </div>
  </section>
</div>

<style>
  .vetrina {
    display: grid;
    gap: var(--spazio-6);
    padding-top: var(--spazio-4);
  }
  header,
  section {
    display: grid;
    gap: var(--spazio-3);
  }
  h2 {
    font-size: var(--testo-l);
  }
  .selettore,
  .riga {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spazio-2);
    align-items: center;
  }
  .campioni {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: var(--spazio-2);
  }
  .campioni li {
    display: flex;
    align-items: center;
    gap: var(--spazio-2);
    font-size: var(--testo-s);
  }
  .campione {
    width: 28px;
    height: 28px;
    border-radius: var(--raggio-s);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.15);
    flex: none;
  }
  .c-sfondo {
    background: var(--colore-sfondo);
  }
  .c-sfondo-2 {
    background: var(--colore-sfondo-2);
  }
  .c-superficie {
    background: var(--colore-superficie);
  }
  .c-campo {
    background: var(--colore-campo);
  }
  .c-testo {
    background: var(--colore-testo);
  }
  .c-testo-attenuato {
    background: var(--colore-testo-attenuato);
  }
  .c-accento {
    background: var(--colore-accento);
  }
  .c-accento-scuro {
    background: var(--colore-accento-scuro);
  }
  .c-secondario {
    background: var(--colore-secondario);
  }
  .c-conferma {
    background: var(--colore-conferma);
  }
  .c-evidenza {
    background: var(--colore-evidenza);
  }
</style>
