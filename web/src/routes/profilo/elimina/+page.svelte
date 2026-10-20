<script lang="ts">
  // Eliminazione immediata dell'account (D-035), con password e conferma esplicita.
  import { resolve } from '$app/paths';
  import PaginaAccount from '$lib/componenti/PaginaAccount.svelte';
  import Bottone from '$lib/componenti/Bottone.svelte';
  import { sessione } from '$lib/account/sessione.svelte';
  import { messaggioErrore } from '$lib/account/errori';

  let password = $state('');
  let capito = $state(false);
  let errore = $state('');
  let inCorso = $state(false);
  let eliminato = $state(false);

  async function elimina(evento: SubmitEvent) {
    evento.preventDefault();
    if (!capito) {
      errore = 'Conferma di aver capito che l’operazione non si può annullare.';
      return;
    }
    inCorso = true;
    errore = '';
    try {
      const { eliminaAccount } = await import('$lib/account/azioni');
      await eliminaAccount(password);
      eliminato = true;
    } catch (e) {
      errore = messaggioErrore(e);
    } finally {
      inCorso = false;
    }
  }
</script>

<PaginaAccount titolo="Elimina l'account" etichetta="Privacy">
  {#if eliminato}
    <p class="messaggio-ok" role="status">Account eliminato. Grazie di essere passato!</p>
    <p class="attenuato">Se cambi idea, puoi sempre registrarti di nuovo.</p>
    <p><a href={resolve('/')}>Torna alla Home</a></p>
  {:else if sessione.stato === 'ospite'}
    <p><a href={resolve('/accedi')}>Accedi</a> per eliminare il tuo account.</p>
  {:else}
    <p>Eliminando l'account cancelli <strong>subito e per sempre</strong>:</p>
    <ul>
      <li>il tuo accesso (email e password);</li>
      <li>il profilo, la scheda visibile agli altri e la richiesta, se è ancora in attesa;</li>
      <li>il tuo link d'invito.</li>
    </ul>
    <p class="attenuato">
      Prima, se vuoi, <a href={resolve('/profilo/dati')}>scarica una copia dei tuoi dati</a>.
    </p>
    <form class="modulo" onsubmit={elimina}>
      <label class="campo">
        <span>Per sicurezza, reinserisci la password</span>
        <input type="password" bind:value={password} required autocomplete="current-password" />
      </label>
      <label class="spunta">
        <input type="checkbox" bind:checked={capito} />
        <span>Ho capito che l'eliminazione non si può annullare.</span>
      </label>
      {#if errore}<p class="messaggio-errore" role="alert">{errore}</p>{/if}
      <Bottone type="submit" disabled={inCorso}>
        {inCorso ? 'Eliminazione…' : "Elimina definitivamente l'account"}
      </Bottone>
    </form>
    <p><a href={resolve('/profilo')}>Annulla e torna al profilo</a></p>
  {/if}
</PaginaAccount>

<style>
  p,
  ul {
    margin: 0;
  }
  ul {
    padding-left: var(--spazio-5);
    display: grid;
    gap: var(--spazio-1);
  }
</style>
