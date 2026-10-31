<script lang="ts">
  // Profilo: identità, stato, invito, gestione dell'account e diritti sui propri dati (D-035, D-040).
  import { goto } from '$app/navigation';
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

  // Chi è approvato ha il badge accanto al nome; gli altri stati si scrivono per esteso (D-040).
  const STATI = {
    in_attesa: 'In attesa di approvazione',
    sospeso: 'Sospeso',
  } as const;

  let inModifica = $state(false);
  let cambioPassword = $state(false);
  let confermaEliminazione = $state<HTMLDialogElement>();

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
            <p class="nome">
              {sessione.profilo.nome}
              {#if sessione.profilo.stato === 'approvato'}
                <svg
                  class="verificato"
                  viewBox="0 0 24 24"
                  role="img"
                  aria-label="Account verificato"
                >
                  <title>Account verificato</title>
                  <path
                    d="M12 1.5l2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3 1 3-2.6 1.9-1 3-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3-2.6-1.9 1-3-1-3 2.6-1.9 1-3 3.2.1z"
                  />
                  <path class="spunta" d="M7.5 12.3l3 3 6-6.3" />
                </svg>
              {/if}
            </p>
            <p class="attenuato">{sessione.utente?.email}</p>
          </div>
        </div>
        {#if sessione.profilo.stato !== 'approvato'}
          <p class="stato">{STATI[sessione.profilo.stato]}</p>
        {/if}
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
      <a class="pulsante pannello-admin" href={resolve('/admin')}>
        Pannello admin
        <span>Richieste di account</span>
      </a>
    {/if}
    {#if sessione.profilo.stato === 'approvato' && sessione.profilo.codiceInvito}
      <LinkInvito codice={sessione.profilo.codiceInvito} />
    {/if}

    <Scheda>
      <InterruttoreNotifiche />
    </Scheda>

    <Scheda>
      <p class="etichetta">Gestione account</p>
      {#if cambioPassword}
        <CambioPassword chiudi={() => (cambioPassword = false)} />
      {:else}
        <div class="azioni sinistra">
          <Bottone variante="secondario" onclick={() => (cambioPassword = true)}>
            Cambia password
          </Bottone>
          <Bottone variante="secondario" onclick={esci}>Esci</Bottone>
          <Bottone variante="pericolo" onclick={() => confermaEliminazione?.showModal()}>
            Elimina l'account
          </Bottone>
        </div>
      {/if}
    </Scheda>

    <Scheda>
      <p class="etichetta">I tuoi dati</p>
      <p class="attenuato">Puoi vedere e scaricare tutto ciò che l'app conserva su di te.</p>
      <ul class="collegamenti">
        <li><a href={resolve('/profilo/dati')}>Vedi e scarica i tuoi dati</a></li>
        <li><a href={resolve('/privacy')}>Informativa privacy</a></li>
        <li><a href={resolve('/condizioni')}>Condizioni d'uso</a></li>
      </ul>
    </Scheda>
  {/if}
</PaginaAccount>

<!-- Primo passo dell'eliminazione (D-040): il secondo è la password, nella pagina dedicata. -->
<dialog bind:this={confermaEliminazione} aria-labelledby="titolo-eliminazione">
  <h2 id="titolo-eliminazione">Vuoi davvero eliminare l'account?</h2>
  <p class="attenuato">
    Nella pagina successiva ti chiederemo la password. Dopo, l'account e tutti i tuoi dati
    spariscono per sempre.
  </p>
  <div class="azioni">
    <Bottone variante="secondario" onclick={() => confermaEliminazione?.close()}>Annulla</Bottone>
    <Bottone
      variante="pericolo"
      onclick={() => {
        confermaEliminazione?.close();
        goto(resolve('/profilo/elimina'));
      }}
    >
      Continua
    </Bottone>
  </div>
</dialog>

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
    display: flex;
    align-items: center;
    gap: var(--spazio-1);
  }
  /* Badge "verificato" accanto al nome, come sui social (D-040). */
  .verificato {
    width: 1.1em;
    height: 1.1em;
    flex: none;
    fill: var(--colore-accento);
  }
  .verificato .spunta {
    fill: none;
    stroke: var(--colore-sul-accento);
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .stato {
    font-family: var(--font-etichette);
    font-weight: var(--etichette-peso);
    color: var(--colore-evidenza);
  }
  /* Pannello admin: un pulsante a tutta larghezza, come le schede (D-040). */
  .pannello-admin {
    display: grid;
    gap: var(--spazio-1);
    text-align: center;
    padding: var(--spazio-3) var(--spazio-4);
    border-radius: var(--raggio-m);
  }
  .pannello-admin span {
    font-weight: 400;
    font-size: var(--testo-s);
  }
  dialog {
    max-width: min(26rem, calc(100vw - 2 * var(--spazio-4)));
    border: 0;
    border-radius: var(--raggio-m);
    padding: var(--spazio-4);
    background: var(--colore-superficie);
    color: var(--colore-testo);
  }
  dialog[open] {
    display: grid;
    gap: var(--spazio-3);
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 60%);
  }
  dialog h2 {
    margin: 0;
    font-size: var(--testo-l);
  }
  .collegamenti {
    margin: 0;
    padding-left: var(--spazio-5);
    display: grid;
    gap: var(--spazio-2);
  }
</style>
