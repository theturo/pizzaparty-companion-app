<script lang="ts">
  // "Notifiche su questo dispositivo" nel profilo (D-036).
  import Bottone from './Bottone.svelte';
  import {
    notifiche,
    controllaNotifiche,
    attivaNotifiche,
    disattivaNotifiche,
    NotificheNegate,
  } from '$lib/notifiche/notifiche.svelte';

  let inCorso = $state(false);
  let errore = $state('');

  $effect(() => {
    controllaNotifiche();
  });

  async function cambia() {
    inCorso = true;
    errore = '';
    try {
      if (notifiche.attive) await disattivaNotifiche();
      else await attivaNotifiche();
    } catch (e) {
      errore =
        e instanceof NotificheNegate
          ? 'Hai negato il permesso: puoi riattivarlo dalle impostazioni del browser.'
          : 'Non sono riuscito ad attivare le notifiche. Riprova tra poco.';
    } finally {
      inCorso = false;
    }
  }
</script>

<p class="etichetta">Notifiche</p>
{#if notifiche.iosDaInstallare}
  <p class="attenuato">
    Su iPhone le notifiche arrivano solo all'app installata: in Safari tocca
    <strong>Condividi</strong> → <strong>Aggiungi alla schermata Home</strong>, poi apri l'app da lì
    e torna in questa pagina.
  </p>
{:else if !notifiche.supportate}
  <p class="attenuato">Questo browser non supporta le notifiche.</p>
{:else if notifiche.permesso === 'denied' && !notifiche.attive}
  <p class="attenuato">
    Le notifiche sono bloccate per questo sito: puoi riattivarle dalle impostazioni del browser.
  </p>
{:else}
  <p class="attenuato">
    {notifiche.attive
      ? 'Attive su questo dispositivo: ti avvisiamo per le novità del tuo account.'
      : 'Spente su questo dispositivo.'}
  </p>
  <div class="azioni">
    <Bottone
      variante={notifiche.attive ? 'secondario' : 'primario'}
      disabled={inCorso}
      onclick={cambia}
    >
      {notifiche.attive ? 'Disattiva le notifiche' : 'Attiva le notifiche'}
    </Bottone>
  </div>
{/if}
{#if errore}<p class="messaggio-errore" role="alert">{errore}</p>{/if}

<style>
  p {
    margin: 0;
  }
  .azioni {
    display: flex;
  }
</style>
