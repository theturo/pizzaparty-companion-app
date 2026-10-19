<script lang="ts">
  // Profilo: per ora identità e stato dell'account. Modifica, privacy e inviti arrivano con la 1.2–1.3.
  import { resolve } from '$app/paths';
  import PaginaAccount from '$lib/componenti/PaginaAccount.svelte';
  import Bottone from '$lib/componenti/Bottone.svelte';
  import Scheda from '$lib/componenti/Scheda.svelte';
  import ImmagineAvatar from '$lib/componenti/ImmagineAvatar.svelte';
  import VersioneApp from '$lib/componenti/VersioneApp.svelte';
  import LinkInvito from '$lib/componenti/LinkInvito.svelte';
  import { sessione } from '$lib/account/sessione.svelte';

  const STATI = {
    in_attesa: 'In attesa di approvazione',
    approvato: 'Approvato',
    sospeso: 'Sospeso',
  } as const;

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
          Arturo controlla ogni nuova richiesta. Intanto puoi dare un'occhiata alle parti pubbliche
          dell'app.
        </p>
      {/if}
    </Scheda>
    {#if sessione.permessi.admin}
      <p><a href={resolve('/admin')}>Pannello admin: richieste di account</a></p>
    {/if}
    {#if sessione.profilo.stato === 'approvato' && sessione.profilo.codiceInvito}
      <LinkInvito codice={sessione.profilo.codiceInvito} />
    {/if}
    <Bottone variante="secondario" onclick={esci}>Esci</Bottone>
  {/if}
</PaginaAccount>

<VersioneApp />

<style>
  .azioni {
    display: flex;
    gap: var(--spazio-2);
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
    margin: 0;
    font-weight: 700;
    font-size: var(--testo-l);
  }
  .stato {
    margin: 0;
    font-family: var(--font-etichette);
    font-weight: var(--etichette-peso);
    color: var(--colore-evidenza);
  }
  .stato-approvato {
    color: var(--colore-conferma);
  }
</style>
