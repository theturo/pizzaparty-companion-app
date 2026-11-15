<script lang="ts">
  // Il QR d'ingresso apre questa pagina con ?c=<codice>: registra la presenza (D-058, D-059).
  // È una query e non una rotta dinamica: il sito è statico.
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import PaginaAccount from '$lib/componenti/PaginaAccount.svelte';
  import { sessione } from '$lib/account/sessione.svelte';
  import { messaggioDiErrore, oraRoma } from '$lib/edizioni/checkin';

  type Stato =
    | { tipo: 'in-corso' }
    | { tipo: 'senza-accesso' }
    | { tipo: 'registrata'; ora: string }
    | { tipo: 'gia-presente'; ora: string }
    | { tipo: 'errore'; messaggio: string };

  let stato = $state<Stato>({ tipo: 'in-corso' });

  // Chi ha l'app installata non ha bisogno di questa riga: la pagina gira già lì dentro (D-064).
  let mostraNotaApp = $state(false);
  $effect(() => {
    const installata =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    mostraNotaApp = !installata;
  });

  // Il codice è nella query; si decide solo nel browser, quando la sessione è nota.
  $effect(() => {
    if (sessione.stato === 'caricamento') return;
    const codice = page.url.searchParams.get('c');
    if (!codice) {
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
        const risposta = await registraPresenza(codice);
        if (annullato) return;
        stato = {
          tipo: risposta.esito,
          ora: oraRoma(new Date(risposta.registrata)),
        };
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
    <p>Accedi al tuo account per registrare la presenza.</p>
    <p>
      <a
        class="pulsante"
        href={resolve(`/accedi?ritorno=${encodeURIComponent(diQui)}` as '/accedi')}
      >
        Accedi
      </a>
    </p>
  </PaginaAccount>
{:else if stato.tipo === 'registrata'}
  <PaginaAccount titolo="Sei dentro!">
    <p>Presenza registrata alle {stato.ora}. Buona festa!</p>
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
</style>
