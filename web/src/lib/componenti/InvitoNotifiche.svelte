<script lang="ts">
  // Invito discreto ad attivare le notifiche, per chi aspetta l'approvazione (D-036).
  import Scheda from './Scheda.svelte';
  import Bottone from './Bottone.svelte';
  import {
    notifiche,
    controllaNotifiche,
    attivaNotifiche,
    chiudiInvito,
  } from '$lib/notifiche/notifiche.svelte';

  let inCorso = $state(false);
  let negato = $state(false);

  $effect(() => {
    controllaNotifiche();
  });

  async function attiva() {
    inCorso = true;
    try {
      await attivaNotifiche();
    } catch {
      negato = true;
    } finally {
      inCorso = false;
    }
  }
</script>

{#if notifiche.supportate && !notifiche.iosDaInstallare && !notifiche.attive && !notifiche.invitoChiuso && notifiche.permesso !== 'denied'}
  <Scheda>
    <p class="etichetta">Vuoi saperlo subito?</p>
    <p>Attiva le notifiche: ti avvisiamo appena la tua richiesta viene approvata.</p>
    {#if negato}
      <p class="attenuato">Va bene, puoi sempre attivarle più tardi dal profilo.</p>
    {/if}
    <div class="azioni">
      <Bottone variante="secondario" onclick={chiudiInvito}>No, grazie</Bottone>
      <Bottone disabled={inCorso} onclick={attiva}>Avvisami</Bottone>
    </div>
  </Scheda>
{/if}

<style>
  p {
    margin: 0;
  }
  .azioni {
    display: flex;
    gap: var(--spazio-2);
    justify-content: flex-end;
  }
</style>
