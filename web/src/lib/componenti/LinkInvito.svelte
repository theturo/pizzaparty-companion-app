<script lang="ts">
  // Il link d'invito personale di chi è approvato (D-033): copia, condividi, rigenera.
  import Scheda from './Scheda.svelte';
  import Bottone from './Bottone.svelte';
  import { messaggioErrore } from '$lib/account/errori';

  let { codice }: { codice: string } = $props();
  let avviso = $state('');
  let confermaRigenera = $state(false);
  let inCorso = $state(false);

  const link = $derived(`${location.origin}/registrati?invito=${codice}`);
  const puoCondividere = typeof navigator !== 'undefined' && 'share' in navigator;

  async function copia() {
    try {
      await navigator.clipboard.writeText(link);
      avviso = 'Link copiato.';
    } catch {
      avviso = 'Copia non riuscita: tieni premuto sul link per copiarlo.';
    }
  }

  async function condividi() {
    try {
      await navigator.share({
        title: 'PizzaParty',
        text: "Unisciti all'app del PizzaParty",
        url: link,
      });
    } catch {
      // Condivisione annullata: niente da fare.
    }
  }

  async function rigenera() {
    inCorso = true;
    try {
      const { rigeneraInvito } = await import('$lib/account/azioni');
      await rigeneraInvito();
      avviso = 'Nuovo link pronto: quello vecchio non funziona più.';
    } catch (e) {
      avviso = messaggioErrore(e);
    } finally {
      inCorso = false;
      confermaRigenera = false;
    }
  }
</script>

<Scheda>
  <p class="etichetta">Il tuo link d'invito</p>
  <p class="attenuato">
    Giralo a chi vuoi portare nell'app, per esempio il tuo +1. La richiesta arriverà ad Arturo con
    il tuo nome.
  </p>
  <p class="link"><code>{link}</code></p>
  <div class="azioni">
    <Bottone onclick={copia}>Copia</Bottone>
    {#if puoCondividere}<Bottone variante="secondario" onclick={condividi}>Condividi</Bottone>{/if}
    {#if confermaRigenera}
      <Bottone variante="secondario" disabled={inCorso} onclick={rigenera}>
        Conferma: nuovo link
      </Bottone>
    {:else}
      <Bottone variante="secondario" onclick={() => (confermaRigenera = true)}>Rigenera</Bottone>
    {/if}
  </div>
  {#if avviso}<p class="messaggio-ok" role="status">{avviso}</p>{/if}
</Scheda>

<style>
  p {
    margin: 0;
  }
  .link code {
    display: block;
    overflow-wrap: anywhere;
    background: var(--colore-campo);
    padding: var(--spazio-2) var(--spazio-3);
    border-radius: var(--raggio-s);
    font-size: var(--testo-s);
  }
  .azioni {
    display: flex;
    gap: var(--spazio-2);
    flex-wrap: wrap;
  }
</style>
