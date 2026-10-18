<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import PaginaAccount from '$lib/componenti/PaginaAccount.svelte';
  import Bottone from '$lib/componenti/Bottone.svelte';
  import { sessione } from '$lib/account/sessione.svelte';
  import { codiceInvitoValido } from '$lib/account/profilo';
  import { messaggioErrore } from '$lib/account/errori';

  let email = $state('');
  let codiceInvito = $state<string | null>(null);
  let inviato = $state(false);
  let inCorso = $state(false);
  let errore = $state('');

  onMount(() => {
    const codice = new URLSearchParams(location.search).get('invito');
    if (codice && codiceInvitoValido(codice)) codiceInvito = codice;
  });

  async function invia(evento: SubmitEvent) {
    evento.preventDefault();
    inCorso = true;
    errore = '';
    try {
      const { inviaLinkRegistrazione } = await import('$lib/account/azioni');
      await inviaLinkRegistrazione(email.trim(), codiceInvito);
      inviato = true;
    } catch (e) {
      errore = messaggioErrore(e);
    } finally {
      inCorso = false;
    }
  }
</script>

<PaginaAccount titolo="Registrati">
  {#if sessione.stato === 'connesso' && sessione.profilo}
    <p>Hai già un account. <a href={resolve('/profilo')}>Vai al profilo</a></p>
  {:else if inviato}
    <p class="messaggio-ok" role="status">Ti abbiamo mandato un link a <strong>{email}</strong>.</p>
    <p class="attenuato">
      Aprilo per verificare l'email e completare la registrazione: sceglierai la password, il nome e
      l'avatar. Se non lo trovi, guarda nello spam.
    </p>
  {:else}
    <p class="attenuato">
      Inserisci la tua email: ti mandiamo un link per verificarla e completare la registrazione.
      {#if codiceInvito}Ti ha invitato qualcuno del giro: la richiesta arriverà con il suo invito.{/if}
    </p>
    <form class="modulo" onsubmit={invia}>
      <label class="campo">
        <span>Email</span>
        <input type="email" bind:value={email} required autocomplete="email" inputmode="email" />
      </label>
      {#if errore}<p class="messaggio-errore" role="alert">{errore}</p>{/if}
      <Bottone type="submit" disabled={inCorso}>
        {inCorso ? 'Invio in corso…' : 'Mandami il link'}
      </Bottone>
    </form>
    <p class="attenuato">Hai già un account? <a href={resolve('/accedi')}>Accedi</a></p>
  {/if}
</PaginaAccount>
