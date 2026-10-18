<script lang="ts">
  // Pagina d'arrivo dei link nelle email di Firebase (D-029): nuova password, verifica email, accesso.
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import PaginaAccount from '$lib/componenti/PaginaAccount.svelte';
  import Bottone from '$lib/componenti/Bottone.svelte';
  import { controllaPassword, PASSWORD_MIN } from '$lib/account/profilo';
  import { messaggioErrore } from '$lib/account/errori';

  type Fase = 'verifica' | 'nuova-password' | 'password-cambiata' | 'email-confermata' | 'errore';
  let fase = $state<Fase>('verifica');
  let errore = $state('');
  let email = $state('');
  let password = $state('');
  let conferma = $state('');
  let inCorso = $state(false);
  let codice = '';

  onMount(async () => {
    const parametri = new URLSearchParams(location.search);
    const modo = parametri.get('mode');
    codice = parametri.get('oobCode') ?? '';
    const azioni = await import('$lib/account/azioni');
    try {
      if (modo === 'signIn') {
        // Link di registrazione: lo gestisce la pagina "Completa".
        // Navigazione completa: i parametri del link (monouso) passano così come sono.
        location.replace(resolve('/completa') + location.search);
      } else if (modo === 'resetPassword') {
        email = await azioni.controllaLinkPassword(codice);
        fase = 'nuova-password';
      } else if (modo === 'verifyEmail') {
        await azioni.confermaEmail(codice);
        fase = 'email-confermata';
      } else {
        errore = 'Link non riconosciuto.';
        fase = 'errore';
      }
    } catch (e) {
      errore = messaggioErrore(e);
      fase = 'errore';
    }
  });

  async function salva(evento: SubmitEvent) {
    evento.preventDefault();
    errore = controllaPassword(password, conferma) ?? '';
    if (errore) return;
    inCorso = true;
    try {
      const { impostaNuovaPassword } = await import('$lib/account/azioni');
      await impostaNuovaPassword(codice, password);
      fase = 'password-cambiata';
    } catch (e) {
      errore = messaggioErrore(e);
    } finally {
      inCorso = false;
    }
  }
</script>

<PaginaAccount titolo={fase === 'nuova-password' ? 'Nuova password' : 'Un attimo'}>
  {#if fase === 'verifica'}
    <p class="attenuato" role="status">Controllo il link…</p>
  {:else if fase === 'nuova-password'}
    <p class="attenuato">Scegli una nuova password per <strong>{email}</strong>.</p>
    <form class="modulo" onsubmit={salva}>
      <label class="campo">
        <span>Nuova password (almeno {PASSWORD_MIN} caratteri)</span>
        <input type="password" bind:value={password} required autocomplete="new-password" />
      </label>
      <label class="campo">
        <span>Ripeti la password</span>
        <input type="password" bind:value={conferma} required autocomplete="new-password" />
      </label>
      {#if errore}<p class="messaggio-errore" role="alert">{errore}</p>{/if}
      <Bottone type="submit" disabled={inCorso}>Salva la password</Bottone>
    </form>
  {:else if fase === 'password-cambiata'}
    <p class="messaggio-ok" role="status">Password cambiata.</p>
    <p><a href={resolve('/accedi')}>Accedi</a></p>
  {:else if fase === 'email-confermata'}
    <p class="messaggio-ok" role="status">Email confermata.</p>
    <p><a href={resolve('/profilo')}>Vai al profilo</a></p>
  {:else}
    <p class="messaggio-errore" role="alert">{errore}</p>
    <p><a href={resolve('/accedi')}>Torna all'accesso</a></p>
  {/if}
</PaginaAccount>
