<script lang="ts">
  // Il link d'invito personale di chi è approvato (D-033, D-040): mostra, copia, condividi, rigenera.
  import Scheda from './Scheda.svelte';
  import Bottone from './Bottone.svelte';
  import { messaggioErrore } from '$lib/account/errori';

  let { codice }: { codice: string } = $props();
  let avviso = $state('');
  let confermaRigenera = $state(false);
  let inCorso = $state(false);
  let visibile = $state(false);

  /** Messaggio pronto per la condivisione: il link si aggiunge in fondo (D-040). */
  const TESTO_CONDIVISIONE = 'Vieni al PizzaParty! 🍕 Registrati qui:';

  const link = $derived(`${location.origin}/registrati?invito=${codice}`);

  async function copia() {
    try {
      await navigator.clipboard.writeText(link);
      avviso = 'Link copiato.';
    } catch {
      avviso = 'Copia non riuscita: tieni premuto sul link per copiarlo.';
    }
  }

  // Sul telefono si apre la condivisione del sistema (WhatsApp, Telegram…); dove non c'è (PC),
  // WhatsApp Web con il messaggio già scritto.
  async function condividi() {
    const testo = `${TESTO_CONDIVISIONE} ${link}`;
    if ('share' in navigator) {
      try {
        await navigator.share({ text: testo });
      } catch {
        // Condivisione annullata: niente da fare.
      }
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(testo)}`, '_blank', 'noopener');
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
  <p class="attenuato">Giralo a chi vuoi portare nell'app, per esempio il tuo +1.</p>
  <p class="attenuato">La richiesta arriverà ad Arturo con il tuo nome.</p>
  {#if visibile}
    <p class="link"><code>{link}</code></p>
  {/if}
  <div class="azioni">
    <Bottone variante="secondario" aria-expanded={visibile} onclick={() => (visibile = !visibile)}>
      {visibile ? 'Nascondi' : 'Mostra'}
    </Bottone>
    <Bottone onclick={copia}>Copia</Bottone>
    <Bottone onclick={condividi}>Condividi</Bottone>
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
