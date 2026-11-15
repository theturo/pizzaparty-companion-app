<script lang="ts">
  import Dinosauro from '$lib/componenti/Dinosauro.svelte';
  import Pellicola from '$lib/componenti/Pellicola.svelte';
  import PaginaIngresso from '$lib/componenti/PaginaIngresso.svelte';
  import Caricamento from '$lib/componenti/Caricamento.svelte';
  import { faseAccesso } from '$lib/account/accesso';
  import { sessione } from '$lib/account/sessione.svelte';
  import { descriviQuando, orariDi, type Edizione } from '$lib/edizioni/edizione';
  import { eAperto, oraRoma } from '$lib/edizioni/checkin';
  import { maiuscola, scegliEdizioneHome, tempoMancante, testoMancante } from '$lib/edizioni/home';
  import { applicaTema, TEMA_PREDEFINITO, TEMI, type IdTema } from '$lib/tema/temi';

  // Chi non è approvato vede la pagina d'ingresso (D-045); finché lo stato non è noto, nulla.
  const fase = $derived(faseAccesso(sessione));

  // Il documento dell'edizione con il suo id (serve per la presenza, D-058).
  type EdizioneConId = Edizione & { id: string };

  // Le edizioni da mostrare alla Home (D-056). null = la prima risposta non è ancora arrivata.
  let edizioni = $state<EdizioneConId[] | null>(null);
  let errore = $state(false);
  const pronta = $derived(edizioni !== null || errore);
  const scelta = $derived(edizioni ? scegliEdizioneHome(edizioni) : null);

  // Il conto alla rovescia si aggiorna ogni 30 secondi, solo quando c'è una data esatta.
  let adesso = $state(new Date());
  const dataConto = $derived(
    scelta && scelta.quando.tipo === 'data' && scelta.stato === 'annunciata'
      ? scelta.quando.data
      : null,
  );
  const tempo = $derived(dataConto ? tempoMancante(dataConto, adesso) : null);
  const conto = $derived(tempo !== null && typeof tempo === 'object' ? tempo : null);

  // Le regole chiedono il permesso "approvato" sul token, che può arrivare poco dopo il profilo:
  // l'ascolto parte (e riparte) solo quando c'è (all'admin basta il suo).
  $effect(() => {
    if (fase !== 'approvato' || !(sessione.permessi.approvato || sessione.permessi.admin)) return;
    let smetti: (() => void) | undefined;
    let annullato = false;
    (async () => {
      const [{ firebase }, { collection, onSnapshot, query, where }] = await Promise.all([
        import('$lib/firebase/app'),
        import('firebase/firestore'),
      ]);
      if (annullato) return;
      // Stesse condizioni delle regole (firestore.rules): niente orderBy, si ordina sul client.
      const elenco = query(
        collection(firebase().db, 'edizioni'),
        where('stato', 'in', ['annunciata', 'annullata']),
      );
      smetti = onSnapshot(
        elenco,
        (istantanea) => {
          errore = false;
          edizioni = istantanea.docs.map((d) => ({ ...(d.data() as Edizione), id: d.id }));
        },
        () => {
          errore = true;
          edizioni = null;
        },
      );
    })();
    return () => {
      annullato = true;
      smetti?.();
    };
  });

  $effect(() => {
    if (!scelta) return;
    const id = scelta.tema;
    applicaTema(TEMI.some((t) => t.id === id) ? (id as IdTema) : TEMA_PREDEFINITO);
  });

  $effect(() => {
    if (dataConto === null) return;
    adesso = new Date();
    const timer = setInterval(() => {
      adesso = new Date();
    }, 30_000);
    return () => clearInterval(timer);
  });

  // Check-in (D-058): la scheda compare solo la sera della festa, con la finestra aperta.
  const inCheckin = $derived(scelta !== null && eAperto(scelta, adesso));
  // undefined = non ancora letta; null = nessuna presenza; altrimenti l'ora di registrazione.
  let presenza = $state<{ registrata: Date } | null | undefined>(undefined);

  $effect(() => {
    const uid = sessione.utente?.uid;
    const id = scelta?.id;
    if (!inCheckin || !uid || !id) return;
    let smetti: (() => void) | undefined;
    let annullato = false;
    (async () => {
      const [{ firebase }, { doc, onSnapshot }] = await Promise.all([
        import('$lib/firebase/app'),
        import('firebase/firestore'),
      ]);
      if (annullato) return;
      smetti = onSnapshot(
        doc(firebase().db, 'edizioni', id, 'presenze', uid),
        (istantanea) => {
          const registrata = istantanea.get('registrata') as { toDate(): Date } | undefined;
          presenza = istantanea.exists()
            ? { registrata: registrata?.toDate() ?? new Date() }
            : null;
        },
        () => {
          presenza = null;
        },
      );
    })();
    return () => {
      annullato = true;
      smetti?.();
      presenza = undefined;
    };
  });
</script>

<svelte:head>
  <title>PizzaParty</title>
  <meta name="description" content="L'app che accompagna il PizzaParty. In costruzione." />
</svelte:head>

{#if fase === 'approvato'}
  {#if !pronta}
    <Caricamento />
  {:else if scelta === null}
    <section>
      <p class="etichetta">Companion App</p>
      <h1 class="titolo">Il forno si sta scaldando.</h1>
      <p class="attenuato">
        Qui arriveranno il countdown alla prossima edizione e il check-in della serata. Ci vediamo
        in primavera.
      </p>
      <div class="mascotte">
        <Dinosauro posa="saluta" larghezza={180} />
        <Pellicola />
      </div>
    </section>
  {:else if scelta.stato === 'annullata'}
    <section>
      <p><span class="badge">Annullata</span></p>
      <h1 class="titolo">{scelta.nome}</h1>
      <p class="attenuato">Questa edizione è annullata.</p>
      <p class="attenuato">La Fondazione PizzaParty si scusa: ci rifaremo presto.</p>
      <div class="mascotte">
        <Dinosauro posa="aspetta" larghezza={180} />
      </div>
    </section>
  {:else}
    <section>
      <p class="etichetta">Prossima edizione</p>
      <h1 class="titolo">{scelta.nome}</h1>
      {#if scelta.quando.tipo === 'periodo'}
        <p class="data">{scelta.quando.periodo}</p>
        <p class="attenuato">data in arrivo</p>
      {:else}
        <p class="data">{maiuscola(descriviQuando(scelta.quando))}</p>
        {@const orari = orariDi(scelta.quando)}
        <p class="attenuato">dalle {orari.inizio} alle {orari.fine}</p>
        {#if inCheckin && presenza !== undefined}
          <div class="scheda-checkin">
            {#if presenza}
              <h2 class="titolo-piccolo">Sei dentro!</h2>
              <p>Presenza registrata alle {oraRoma(presenza.registrata)}.</p>
            {:else}
              <h2 class="titolo-piccolo">Sei arrivato alla festa?</h2>
              <p>Inquadra il QR all'ingresso con la fotocamera del telefono.</p>
            {/if}
          </div>
        {/if}
        {#if tempo === 'oggi'}
          <p class="titolo-piccolo">Ci siamo: è oggi!</p>
        {:else if conto}
          <div class="conto" role="group" aria-label={testoMancante(conto)}>
            <div class="casella" aria-hidden="true">
              <span class="numero">{conto.giorni}</span>
              <span class="unita">{conto.giorni === 1 ? 'giorno' : 'giorni'}</span>
            </div>
            <div class="casella" aria-hidden="true">
              <span class="numero">{conto.ore}</span>
              <span class="unita">{conto.ore === 1 ? 'ora' : 'ore'}</span>
            </div>
            <div class="casella" aria-hidden="true">
              <span class="numero">{conto.minuti}</span>
              <span class="unita">{conto.minuti === 1 ? 'minuto' : 'minuti'}</span>
            </div>
          </div>
        {/if}
      {/if}
      <div class="mascotte">
        <Dinosauro posa="saluta" larghezza={180} />
        <Pellicola />
      </div>
    </section>
  {/if}
{:else if fase === 'caricamento'}
  <Caricamento />
{:else}
  <PaginaIngresso {fase} />
{/if}

<style>
  section {
    min-height: 60dvh;
    display: grid;
    place-content: center;
    gap: var(--spazio-3);
    text-align: center;
  }
  .titolo {
    font-size: var(--testo-xxl);
  }
  .titolo-piccolo {
    font-family: var(--font-titoli);
    font-style: var(--titoli-stile);
    font-weight: var(--titoli-peso);
    font-size: var(--testo-xl);
    color: var(--colore-accento);
  }
  .data {
    font-size: var(--testo-l);
    font-weight: 600;
  }
  .badge {
    display: inline-block;
    /* Testo grande e in grassetto: il contrasto col rosso del tema è sufficiente per il testo grande. */
    font-size: var(--testo-l);
    font-weight: 700;
    line-height: 1;
    padding: var(--spazio-2) var(--spazio-4);
    border-radius: var(--raggio-s);
    background: var(--colore-secondario);
    color: var(--colore-sul-accento);
  }
  .conto {
    display: flex;
    justify-content: center;
    gap: var(--spazio-3);
    margin-top: var(--spazio-3);
  }
  .casella {
    display: grid;
    gap: var(--spazio-1);
    justify-items: center;
    min-width: 0;
    flex: 0 1 6rem;
    padding: var(--spazio-3) var(--spazio-2);
    background: var(--colore-superficie);
    border-radius: var(--raggio-s);
  }
  .numero {
    font-family: var(--font-titoli);
    font-size: var(--testo-xl);
    font-weight: var(--titoli-peso);
    font-style: var(--titoli-stile);
    line-height: 1;
    color: var(--colore-accento);
  }
  .scheda-checkin {
    display: grid;
    gap: var(--spazio-1);
    justify-items: center;
    max-width: 30rem;
    margin: var(--spazio-3) auto 0;
    padding: var(--spazio-3) var(--spazio-4);
    background: var(--colore-superficie);
    border-radius: var(--raggio-s);
  }
  .unita {
    font-size: var(--testo-s);
    color: var(--colore-testo-attenuato);
  }
  .mascotte {
    display: grid;
    justify-items: center;
    margin-top: var(--spazio-5);
  }
  .mascotte :global(.pellicola) {
    width: 100%;
  }
</style>
