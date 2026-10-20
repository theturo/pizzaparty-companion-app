<script lang="ts">
  // Profilo: identità, stato, invito, sicurezza e diritti sui propri dati (D-035).
  import { resolve } from '$app/paths';
  import PaginaAccount from '$lib/componenti/PaginaAccount.svelte';
  import Bottone from '$lib/componenti/Bottone.svelte';
  import Scheda from '$lib/componenti/Scheda.svelte';
  import ImmagineAvatar from '$lib/componenti/ImmagineAvatar.svelte';
  import VersioneApp from '$lib/componenti/VersioneApp.svelte';
  import LinkInvito from '$lib/componenti/LinkInvito.svelte';
  import ModificaProfilo from '$lib/componenti/ModificaProfilo.svelte';
  import CambioPassword from '$lib/componenti/CambioPassword.svelte';
  import InterruttoreNotifiche from '$lib/componenti/InterruttoreNotifiche.svelte';
  import InvitoNotifiche from '$lib/componenti/InvitoNotifiche.svelte';
  import { sessione } from '$lib/account/sessione.svelte';

  const STATI = {
    in_attesa: 'In attesa di approvazione',
    approvato: 'Approvato',
    sospeso: 'Sospeso',
  } as const;

  let inModifica = $state(false);
  let cambioPassword = $state(false);

  async function esci() {
    const { esci } = await import('$lib/account/azioni');
    await esci();
  }
</script>

<PaginaAccount titolo="Profilo" etichetta="Il tuo PizzaParty">
  {#if sessione.stato === 'caricamento' || (sessione.stato === 'connesso' && !sessione.profiloCaricato)}
    <p class="attenuato" role="status">Un momento…</p>
  {:else if sessione.stato === 'ospite'}
    <p class="attenuato">
      Accedi per vedere il tuo profilo, i trofei e ordinare la pizza alla festa.
    </p>
    <div class="azioni">
      <a class="pulsante" href={resolve('/accedi')}>Accedi</a>
      <a class="pulsante secondario" href={resolve('/registrati')}>Registrati</a>
    </div>
  {:else if !sessione.profilo}
    <p class="attenuato">Manca poco: completa la registrazione con nome, avatar e password.</p>
    <p><a href={resolve('/completa')}>Completa la registrazione</a></p>
  {:else}
    <Scheda>
      {#if inModifica}
        <ModificaProfilo profilo={sessione.profilo} chiudi={() => (inModifica = false)} />
      {:else}
        <div class="identita">
          <ImmagineAvatar id={sessione.profilo.avatar} dimensione={64} />
          <div>
            <p class="nome">{sessione.profilo.nome}</p>
            <p class="attenuato">{sessione.utente?.email}</p>
          </div>
        </div>
        <p class="stato stato-{sessione.profilo.stato}">{STATI[sessione.profilo.stato]}</p>
        {#if sessione.profilo.stato === 'in_attesa'}
          <p class="attenuato">
            Arturo controlla ogni nuova richiesta. Intanto puoi dare un'occhiata alle parti
            pubbliche dell'app.
          </p>
        {/if}
        <div class="azioni">
          <Bottone variante="secondario" onclick={() => (inModifica = true)}>Modifica</Bottone>
        </div>
      {/if}
    </Scheda>

    {#if sessione.profilo.stato === 'in_attesa'}
      <InvitoNotifiche />
    {/if}
    {#if sessione.permessi.admin}
      <p><a href={resolve('/admin')}>Pannello admin: richieste di account</a></p>
    {/if}
    {#if sessione.profilo.stato === 'approvato' && sessione.profilo.codiceInvito}
      <LinkInvito codice={sessione.profilo.codiceInvito} />
    {/if}

    <Scheda>
      <InterruttoreNotifiche />
    </Scheda>

    <Scheda>
      <p class="etichetta">Sicurezza</p>
      {#if cambioPassword}
        <CambioPassword chiudi={() => (cambioPassword = false)} />
      {:else}
        <div class="azioni sinistra">
          <Bottone variante="secondario" onclick={() => (cambioPassword = true)}>
            Cambia password
          </Bottone>
          <Bottone variante="secondario" onclick={esci}>Esci</Bottone>
        </div>
      {/if}
    </Scheda>

    <Scheda>
      <p class="etichetta">I tuoi dati</p>
      <p class="attenuato">
        Puoi vedere e scaricare tutto ciò che l'app conserva su di te, oppure eliminare l'account.
      </p>
      <ul class="collegamenti">
        <li><a href={resolve('/profilo/dati')}>Vedi e scarica i tuoi dati</a></li>
        <li><a href={resolve('/privacy')}>Informativa privacy</a></li>
        <li><a href={resolve('/condizioni')}>Condizioni d'uso</a></li>
        <li><a class="pericolo" href={resolve('/profilo/elimina')}>Elimina l'account</a></li>
      </ul>
    </Scheda>
  {/if}
</PaginaAccount>

<VersioneApp />

<style>
  p {
    margin: 0;
  }
  .azioni {
    display: flex;
    gap: var(--spazio-2);
    justify-content: flex-end;
    flex-wrap: wrap;
  }
  .azioni.sinistra {
    justify-content: flex-start;
  }
  .pulsante {
    background: var(--colore-accento);
    color: var(--colore-sul-accento);
    border-radius: var(--raggio-s);
    padding: var(--spazio-2) var(--spazio-4);
    font-weight: 700;
    text-decoration: none;
  }
  .pulsante.secondario {
    background: var(--colore-sfondo-2);
    color: var(--colore-testo);
    box-shadow: inset 0 0 0 1px var(--colore-accento-scuro);
  }
  .identita {
    display: flex;
    align-items: center;
    gap: var(--spazio-3);
  }
  .nome {
    font-weight: 700;
    font-size: var(--testo-l);
  }
  .stato {
    font-family: var(--font-etichette);
    font-weight: var(--etichette-peso);
    color: var(--colore-evidenza);
  }
  .stato-approvato {
    color: var(--colore-conferma);
  }
  .collegamenti {
    margin: 0;
    padding-left: var(--spazio-5);
    display: grid;
    gap: var(--spazio-2);
  }
  .pericolo {
    color: var(--colore-secondario);
  }
</style>
