<script lang="ts">
  import Bottone from './Bottone.svelte';
  import { controllaPassword, PASSWORD_MIN } from '$lib/account/profilo';
  import { messaggioErrore } from '$lib/account/errori';

  let { chiudi }: { chiudi: () => void } = $props();
  let attuale = $state('');
  let nuova = $state('');
  let conferma = $state('');
  let errore = $state('');
  let fatto = $state(false);
  let inCorso = $state(false);

  async function salva(evento: SubmitEvent) {
    evento.preventDefault();
    errore = controllaPassword(nuova, conferma) ?? '';
    if (errore) return;
    inCorso = true;
    try {
      const { cambiaPassword } = await import('$lib/account/azioni');
      await cambiaPassword(attuale, nuova);
      fatto = true;
    } catch (e) {
      errore = messaggioErrore(e);
    } finally {
      inCorso = false;
    }
  }
</script>

{#if fatto}
  <p class="messaggio-ok" role="status">Password cambiata.</p>
  <Bottone variante="secondario" onclick={chiudi}>Chiudi</Bottone>
{:else}
  <form class="modulo" onsubmit={salva}>
    <label class="campo">
      <span>Password attuale</span>
      <input type="password" bind:value={attuale} required autocomplete="current-password" />
    </label>
    <label class="campo">
      <span>Nuova password (almeno {PASSWORD_MIN} caratteri)</span>
      <input type="password" bind:value={nuova} required autocomplete="new-password" />
    </label>
    <label class="campo">
      <span>Ripeti la nuova password</span>
      <input type="password" bind:value={conferma} required autocomplete="new-password" />
    </label>
    {#if errore}<p class="messaggio-errore" role="alert">{errore}</p>{/if}
    <div class="azioni">
      <Bottone type="button" variante="secondario" onclick={chiudi}>Annulla</Bottone>
      <Bottone type="submit" disabled={inCorso}>Cambia password</Bottone>
    </div>
  </form>
{/if}

<style>
  .azioni {
    display: flex;
    gap: var(--spazio-2);
    justify-content: flex-end;
  }
</style>
