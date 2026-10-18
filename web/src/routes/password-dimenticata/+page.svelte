<script lang="ts">
  import { resolve } from '$app/paths';
  import PaginaAccount from '$lib/componenti/PaginaAccount.svelte';
  import Bottone from '$lib/componenti/Bottone.svelte';
  import { messaggioErrore } from '$lib/account/errori';

  let email = $state('');
  let inviato = $state(false);
  let inCorso = $state(false);
  let errore = $state('');

  async function invia(evento: SubmitEvent) {
    evento.preventDefault();
    inCorso = true;
    errore = '';
    try {
      const { inviaLinkPassword } = await import('$lib/account/azioni');
      await inviaLinkPassword(email.trim());
      inviato = true;
    } catch (e) {
      // Per non rivelare quali email sono registrate, "utente inesistente" vale come inviato.
      if ((e as { code?: string })?.code === 'auth/user-not-found') inviato = true;
      else errore = messaggioErrore(e);
    } finally {
      inCorso = false;
    }
  }
</script>

<PaginaAccount titolo="Password dimenticata">
  {#if inviato}
    <p class="messaggio-ok" role="status">
      Se <strong>{email}</strong> ha un account, ti è arrivato un link per scegliere una nuova password.
    </p>
    <p><a href={resolve('/accedi')}>Torna all'accesso</a></p>
  {:else}
    <p class="attenuato">Ti mandiamo un link per scegliere una nuova password.</p>
    <form class="modulo" onsubmit={invia}>
      <label class="campo">
        <span>Email</span>
        <input type="email" bind:value={email} required autocomplete="email" inputmode="email" />
      </label>
      {#if errore}<p class="messaggio-errore" role="alert">{errore}</p>{/if}
      <Bottone type="submit" disabled={inCorso}>Mandami il link</Bottone>
    </form>
  {/if}
</PaginaAccount>
