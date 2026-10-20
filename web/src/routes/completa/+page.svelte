<script lang="ts">
  // Pagina di arrivo del link email (D-024): verifica l'email, poi password, nome, avatar e consensi.
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import PaginaAccount from '$lib/componenti/PaginaAccount.svelte';
  import Bottone from '$lib/componenti/Bottone.svelte';
  import SceltaAvatar from '$lib/componenti/SceltaAvatar.svelte';
  import InvitoNotifiche from '$lib/componenti/InvitoNotifiche.svelte';
  import { sessione } from '$lib/account/sessione.svelte';
  import { AVATAR } from '$lib/account/avatar';
  import {
    controllaNome,
    controllaPassword,
    codiceInvitoValido,
    INVITO_TESTO_MAX,
    NOME_MAX,
    PASSWORD_MIN,
  } from '$lib/account/profilo';
  import { messaggioErrore } from '$lib/account/errori';

  type Fase = 'verifica' | 'chiedi-email' | 'link-non-valido' | 'modulo' | 'fatto';
  let fase = $state<Fase>('verifica');
  let errore = $state('');
  let inCorso = $state(false);

  let email = $state('');
  let password = $state('');
  let conferma = $state('');
  let nome = $state('');
  let avatar = $state(AVATAR[0].id);
  let invitoTesto = $state('');
  let maggiorenne = $state(false);
  let accettaDocumenti = $state(false);
  let codiceInvito = $state<string | null>(null);
  let linkOriginale = '';

  /** Il codice d'invito arriva diretto (?invito=) o, passando da /azione, dentro continueUrl. */
  function leggiCodiceInvito(parametri: URLSearchParams): string | null {
    const diretto = parametri.get('invito');
    if (diretto) return diretto;
    const continua = parametri.get('continueUrl');
    if (!continua) return null;
    try {
      return new URL(continua).searchParams.get('invito');
    } catch {
      return null;
    }
  }

  onMount(async () => {
    const codice = leggiCodiceInvito(new URLSearchParams(location.search));
    if (codice && codiceInvitoValido(codice)) codiceInvito = codice;

    const { eLinkDiAccesso, emailRicordata } = await import('$lib/account/azioni');
    if (__ACCOUNT_ATTIVI__ && eLinkDiAccesso(location.href)) {
      linkOriginale = location.href;
      // Il codice del link è monouso: lo si toglie dall'indirizzo.
      history.replaceState(null, '', codiceInvito ? `?invito=${codiceInvito}` : location.pathname);
      const ricordata = emailRicordata();
      if (ricordata) await apriLink(ricordata);
      else fase = 'chiedi-email';
    } else {
      fase = 'link-non-valido';
    }
  });

  async function apriLink(indirizzo: string) {
    inCorso = true;
    errore = '';
    try {
      const { accediConLink } = await import('$lib/account/azioni');
      await accediConLink(indirizzo.trim(), linkOriginale);
      fase = 'modulo';
    } catch (e) {
      errore = messaggioErrore(e);
      fase = 'chiedi-email';
    } finally {
      inCorso = false;
    }
  }

  // Chi è già connesso ma non ha ancora un profilo (ha chiuso la pagina a metà) riprende dal modulo.
  $effect(() => {
    if (fase === 'link-non-valido' && sessione.stato === 'connesso' && sessione.profiloCaricato) {
      if (!sessione.profilo) fase = 'modulo';
    }
  });

  const giaRegistrato = $derived(
    sessione.stato === 'connesso' && sessione.profiloCaricato && sessione.profilo !== null,
  );

  async function completa(evento: SubmitEvent) {
    evento.preventDefault();
    errore =
      controllaPassword(password, conferma) ??
      controllaNome(nome) ??
      (!maggiorenne || !accettaDocumenti ? 'Per continuare servono entrambe le conferme.' : '');
    if (errore) return;
    inCorso = true;
    try {
      const { completaRegistrazione } = await import('$lib/account/azioni');
      await completaRegistrazione({
        password,
        nome,
        avatar,
        invitatoDa: {
          codice: codiceInvito,
          testo: codiceInvito ? null : invitoTesto.trim() || null,
        },
      });
      fase = 'fatto';
    } catch (e) {
      errore = messaggioErrore(e);
    } finally {
      inCorso = false;
    }
  }
</script>

<PaginaAccount titolo="Completa la registrazione">
  {#if fase === 'fatto'}
    <p class="messaggio-ok" role="status">Richiesta inviata!</p>
    <p class="attenuato">
      Il tuo account è <strong>in attesa di approvazione</strong>: Arturo lo controllerà a breve. Se
      hai l'app installata sul telefono, aprila e accedi con la tua email e la password appena
      scelta.
    </p>
    <InvitoNotifiche />
    <p><a href={resolve('/profilo')}>Vai al profilo</a></p>
  {:else if giaRegistrato}
    <p>Sei già registrato. <a href={resolve('/profilo')}>Vai al profilo</a></p>
  {:else if fase === 'verifica'}
    <p class="attenuato" role="status">Controllo il link…</p>
  {:else if fase === 'link-non-valido'}
    <p class="attenuato">
      Questa pagina si apre dal link che ti abbiamo mandato via email. Se è scaduto,
      <a href={resolve('/registrati')}>richiedine uno nuovo</a>.
    </p>
  {:else if fase === 'chiedi-email'}
    <p class="attenuato">
      Hai aperto il link su un dispositivo diverso: per sicurezza, conferma la tua email.
    </p>
    <form
      class="modulo"
      onsubmit={(e) => {
        e.preventDefault();
        apriLink(email);
      }}
    >
      <label class="campo">
        <span>Email</span>
        <input type="email" bind:value={email} required autocomplete="email" />
      </label>
      {#if errore}<p class="messaggio-errore" role="alert">{errore}</p>{/if}
      <Bottone type="submit" disabled={inCorso}>Continua</Bottone>
    </form>
  {:else if fase === 'modulo' && !sessione.profiloCaricato}
    <p class="attenuato" role="status">Un momento…</p>
  {:else if fase === 'modulo'}
    <p class="attenuato">Email verificata. Ancora pochi dati e la richiesta è pronta.</p>
    <form class="modulo" onsubmit={completa}>
      <label class="campo">
        <span>Password (almeno {PASSWORD_MIN} caratteri)</span>
        <input type="password" bind:value={password} required autocomplete="new-password" />
      </label>
      <label class="campo">
        <span>Ripeti la password</span>
        <input type="password" bind:value={conferma} required autocomplete="new-password" />
      </label>
      <label class="campo">
        <span>Come ti chiamano al PizzaParty</span>
        <input bind:value={nome} required maxlength={NOME_MAX} autocomplete="name" />
      </label>
      <SceltaAvatar bind:valore={avatar} />
      {#if !codiceInvito}
        <label class="campo">
          <span>Chi ti ha invitato? (facoltativo)</span>
          <input bind:value={invitoTesto} maxlength={INVITO_TESTO_MAX} />
        </label>
      {/if}
      <label class="spunta">
        <input type="checkbox" bind:checked={maggiorenne} />
        <span>Dichiaro di avere almeno 18 anni.</span>
      </label>
      <label class="spunta">
        <input type="checkbox" bind:checked={accettaDocumenti} />
        <span>
          Ho letto l'<a href={resolve('/privacy')}>informativa privacy</a> e accetto le
          <a href={resolve('/condizioni')}>condizioni d'uso</a>.
        </span>
      </label>
      {#if errore}<p class="messaggio-errore" role="alert">{errore}</p>{/if}
      <Bottone type="submit" disabled={inCorso}>
        {inCorso ? 'Invio in corso…' : 'Invia la richiesta'}
      </Bottone>
    </form>
  {/if}
</PaginaAccount>
