<script lang="ts">
  // Il QR d'ingresso apre questa pagina con ?c=<codice>: registra la presenza (D-058, D-059).
  // È una query e non una rotta dinamica: il sito è statico.
  import { tick } from 'svelte';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import Bottone from '$lib/componenti/Bottone.svelte';
  import PaginaAccount from '$lib/componenti/PaginaAccount.svelte';
  import { sessione } from '$lib/account/sessione.svelte';
  import { erroreNomeOspite, messaggioDiErrore, oraRoma } from '$lib/edizioni/checkin';

  type Stato =
    | { tipo: 'in-corso' }
    | { tipo: 'senza-accesso' }
    | { tipo: 'registrata'; ora: string; nomeGiaPresente: boolean }
    | { tipo: 'gia-presente'; ora: string }
    | { tipo: 'errore'; messaggio: string };

  let stato = $state<Stato>({ tipo: 'in-corso' });

  // Chi non ha un account sceglie "Entra come ospite": compare il modulo con il nome (D-068).
  let ospiteAperto = $state(false);
  let nome = $state('');
  let erroreNome = $state('');
  let inCorso = $state(false);
  let campoNome = $state<HTMLInputElement>();

  // Chi ha l'app installata non ha bisogno di questa riga: la pagina gira già lì dentro (D-064).
  let mostraNotaApp = $state(false);
  $effect(() => {
    const installata =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    mostraNotaApp = !installata;
  });

  const codice = $derived(page.url.searchParams.get('c'));

  // Il codice è nella query; si decide solo nel browser, quando la sessione è nota.
  $effect(() => {
    if (sessione.stato === 'caricamento') return;
    const codiceQuery = page.url.searchParams.get('c');
    if (!codiceQuery) {
      stato = { tipo: 'errore', messaggio: 'Questo QR non è valido.' };
      return;
    }
    if (sessione.stato !== 'connesso') {
      stato = { tipo: 'senza-accesso' };
      return;
    }
    let annullato = false;
    stato = { tipo: 'in-corso' };
    (async () => {
      try {
        const { registraPresenza } = await import('$lib/account/azioni');
        const risposta = await registraPresenza(codiceQuery);
        if (annullato) return;
        const ora = oraRoma(new Date(risposta.registrata));
        stato =
          risposta.esito === 'registrata'
            ? { tipo: 'registrata', ora, nomeGiaPresente: false }
            : { tipo: 'gia-presente', ora };
      } catch (errore) {
        if (annullato) return;
        stato = { tipo: 'errore', messaggio: messaggioDiErrore(errore) };
      }
    })();
    return () => {
      annullato = true;
    };
  });

  // Dopo l'accesso si torna qui, con lo stesso codice (D-059).
  const diQui = $derived(page.url.pathname + page.url.search);

  async function apriModulo() {
    ospiteAperto = true;
    await tick();
    campoNome?.focus();
  }

  /** L'ospite entra con l'accesso anonimo e registra la presenza con il nome (D-065, D-067). */
  async function registraComeOspite(evento: SubmitEvent) {
    evento.preventDefault();
    const errore = erroreNomeOspite(nome);
    erroreNome = errore ?? '';
    if (errore) {
      campoNome?.focus();
      return;
    }
    const codiceQuery = codice ?? '';
    inCorso = true;
    try {
      const { entraComeOspite, registraOspite } = await import('$lib/account/azioni');
      await entraComeOspite();
      const risposta = await registraOspite(codiceQuery, nome);
      const ora = oraRoma(new Date(risposta.registrata));
      stato =
        risposta.esito === 'registrata'
          ? { tipo: 'registrata', ora, nomeGiaPresente: risposta.nomeGiaPresente }
          : { tipo: 'gia-presente', ora };
    } catch (errore) {
      stato = { tipo: 'errore', messaggio: messaggioDiErrore(errore) };
    } finally {
      inCorso = false;
    }
  }
</script>

<svelte:head>
  <meta name="robots" content="noindex" />
</svelte:head>

{#if stato.tipo === 'in-corso'}
  <PaginaAccount titolo="Check-in">
    <p role="status">Sto registrando la tua presenza…</p>
  </PaginaAccount>
{:else if stato.tipo === 'senza-accesso'}
  <PaginaAccount titolo="Benvenuto al PizzaParty!">
    <p>Registra la tua presenza: accedi oppure entra come ospite.</p>
    {#if ospiteAperto}
      <h2 class="sottotitolo">Entra come ospite</h2>
      <form class="modulo" onsubmit={registraComeOspite}>
        <label class="campo" for="nome-ospite">
          <span>Il tuo nome</span>
          <input
            id="nome-ospite"
            name="nome"
            type="text"
            autocomplete="name"
            aria-required="true"
            aria-invalid={erroreNome ? 'true' : undefined}
            aria-describedby={erroreNome
              ? 'suggerimento-nome errore-nome informativa-nome'
              : 'suggerimento-nome informativa-nome'}
            bind:value={nome}
            bind:this={campoNome}
          />
        </label>
        <p id="suggerimento-nome" class="attenuato">
          Nome e cognome, o come ti conoscono alla festa.
        </p>
        {#if erroreNome}
          <p id="errore-nome" class="messaggio-errore" role="alert">{erroreNome}</p>
        {/if}
        <div id="informativa-nome" class="attenuato">
          <p>
            Salviamo il nome e l'ora di arrivo per contare i presenti e, se poi ti registri, per
            collegarli al tuo account. Li conserviamo al massimo 3 anni.
          </p>
          <p>
            <a href={resolve('/privacy')}>Dettagli nell'informativa.</a>
          </p>
        </div>
        <Bottone type="submit" disabled={inCorso}>
          {inCorso ? 'Registro la presenza…' : 'Registra la presenza'}
        </Bottone>
      </form>
    {:else}
      <div class="scelte">
        <a
          class="pulsante"
          href={resolve(`/accedi?ritorno=${encodeURIComponent(diQui)}` as '/accedi')}
        >
          Accedi
        </a>
        <Bottone type="button" variante="secondario" onclick={apriModulo}>
          Entra come ospite
        </Bottone>
      </div>
      <p class="attenuato">
        Con un account ritrovi le tue presenze e i trofei. <a href={resolve('/registrati')}
          >Registrati</a
        >
      </p>
    {/if}
  </PaginaAccount>
{:else if stato.tipo === 'registrata'}
  <PaginaAccount titolo="Sei dentro!">
    <p>Presenza registrata alle {stato.ora}. Buona festa!</p>
    {#if stato.nomeGiaPresente}
      <p class="attenuato">C'è già un ospite con questo nome: se non sei tu, dillo allo staff.</p>
    {/if}
    <p>
      <a class="pulsante" href={resolve('/')}>Vai alla Home</a>
    </p>
  </PaginaAccount>
{:else if stato.tipo === 'gia-presente'}
  <PaginaAccount titolo="Ci sei già!">
    <p>La tua presenza è registrata dalle {stato.ora}.</p>
    <p>
      <a class="pulsante" href={resolve('/')}>Vai alla Home</a>
    </p>
  </PaginaAccount>
{:else}
  <PaginaAccount titolo="Check-in non riuscito">
    <p role="alert">{stato.messaggio}</p>
    <p>
      <a class="pulsante" href={resolve('/')}>Vai alla Home</a>
    </p>
  </PaginaAccount>
{/if}

{#if mostraNotaApp}
  <p class="nota-app">Hai l'app installata? Aprila e usa «Scansiona il QR» dalla Home.</p>
{/if}

<style>
  .nota-app {
    margin: var(--spazio-5) auto 0;
    max-width: var(--larghezza-contenuto);
    text-align: center;
    font-size: var(--testo-s);
    color: var(--colore-testo-attenuato);
  }
  .scelte {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spazio-2);
  }
  .sottotitolo {
    font-size: var(--testo-l);
  }
</style>
