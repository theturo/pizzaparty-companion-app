<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import PaginaAccount from '$lib/componenti/PaginaAccount.svelte';
  import Bottone from '$lib/componenti/Bottone.svelte';
  import { sessione } from '$lib/account/sessione.svelte';
  import { messaggioErrore } from '$lib/account/errori';

  let email = $state('');
  let password = $state('');
  let inCorso = $state(false);
  let errore = $state('');

  async function entra(evento: SubmitEvent) {
    evento.preventDefault();
    inCorso = true;
    errore = '';
    try {
      const { accedi } = await import('$lib/account/azioni');
      await accedi(email.trim(), password);
      await goto(resolve('/profilo'));
    } catch (e) {
      errore = messaggioErrore(e);
    } finally {
      inCorso = false;
    }
  }
</script>

<PaginaAccount titolo="Accedi">
  {#if sessione.stato === 'connesso'}
    <p>Sei già connesso. <a href={resolve('/profilo')}>Vai al profilo</a></p>
  {:else}
    <form class="modulo" onsubmit={entra}>
      <label class="campo">
        <span>Email</span>
        <input type="email" bind:value={email} required autocomplete="email" inputmode="email" />
      </label>
      <label class="campo">
        <span>Password</span>
        <input type="password" bind:value={password} required autocomplete="current-password" />
      </label>
      {#if errore}<p class="messaggio-errore" role="alert">{errore}</p>{/if}
      <Bottone type="submit" disabled={inCorso}>{inCorso ? 'Accesso…' : 'Accedi'}</Bottone>
    </form>
    <p class="attenuato">
      <a href={resolve('/password-dimenticata')}>Password dimenticata?</a> ·
      <a href={resolve('/registrati')}>Non hai un account? Registrati</a>
    </p>
  {/if}
</PaginaAccount>
