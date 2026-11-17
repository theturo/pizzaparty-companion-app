<script lang="ts">
  // Pannello admin: presenze alle feste, statistiche e persone senza account (blocco 3.4, D-070–D-072).
  // Le presenze si leggono una volta (collection group) e si ricaricano dopo ogni azione.
  // Le scritture passano da Functions riservate all'admin: la vera protezione sono le regole.
  import { resolve } from '$app/paths';
  import PaginaAccount from '$lib/componenti/PaginaAccount.svelte';
  import Bottone from '$lib/componenti/Bottone.svelte';
  import Scheda from '$lib/componenti/Scheda.svelte';
  import SchedePannello from '$lib/componenti/SchedePannello.svelte';
  import { sessione } from '$lib/account/sessione.svelte';
  import {
    aggiungiPresenza,
    cancellaSegnaposto,
    collegaSegnaposto,
    creaSegnaposto,
    rinominaSegnaposto,
  } from '$lib/account/azioni';
  import { erroreNomeOspite } from '$lib/edizioni/checkin';
  import {
    calcolaStatistiche,
    chiaveSegnaposto,
    eSegnaposto,
    type EdizioneStatistica,
    type PresenzaStatistica,
  } from '$lib/edizioni/statistiche';

  const NON_SALVATO = 'Non sono riuscito a salvare. Riprova tra poco.';
  const NOME_NON_DISPONIBILE = 'Nome non disponibile';

  interface SegnapostoNelPannello {
    id: string;
    nome: string;
    origine: string;
  }
  interface Account {
    uid: string;
    nome: string;
  }
  /** Il pannello aperto sotto una persona senza account: al massimo uno alla volta. */
  type Azione = { tipo: 'rinomina' | 'presenza' | 'collega'; id: string };

  let caricato = $state(false);
  let erroreCaricamento = $state('');
  let edizioni = $state<EdizioneStatistica[]>([]);
  let presenzeGrezze = $state<
    { edizione: string; uid: string | null; segnaposto: string | null; nome: string }[]
  >([]);
  let segnaposto = $state<SegnapostoNelPannello[]>([]);
  let account = $state<Account[]>([]);

  let inCorso = $state(false);
  let errore = $state('');
  let conferma = $state('');

  // Modulo "Aggiungi persona".
  let nuovaPersona = $state('');
  let erroreNuova = $state('');

  let azione = $state<Azione | null>(null);
  let nuovoNome = $state('');
  let edizioneScelta = $state('');
  let accountScelto = $state('');
  let daEliminare = $state<SegnapostoNelPannello | null>(null);
  let daCollegare = $state<{ segnaposto: SegnapostoNelPannello; account: Account } | null>(null);
  let dialogoElimina = $state<HTMLDialogElement>();
  let dialogoCollega = $state<HTMLDialogElement>();

  const nomeAccount = $derived(new Map(account.map((a) => [a.uid, a.nome])));
  const nomeSegnaposto = $derived(new Map(segnaposto.map((s) => [s.id, s.nome])));

  // Le presenze nella forma delle statistiche: un account con il nome da profili, un ospite con il
  // nome del segnaposto (o della presenza, se il segnaposto manca).
  const presenzeStat = $derived<PresenzaStatistica[]>(
    presenzeGrezze.map((p) =>
      p.segnaposto
        ? {
            edizione: p.edizione,
            chiave: chiaveSegnaposto(p.segnaposto),
            nome: nomeSegnaposto.get(p.segnaposto) ?? p.nome,
          }
        : {
            edizione: p.edizione,
            chiave: p.uid ?? '',
            nome: nomeAccount.get(p.uid ?? '') ?? NOME_NON_DISPONIBILE,
          },
    ),
  );
  const statistiche = $derived(calcolaStatistiche(presenzeStat, edizioni));
  /** Quante presenze ha una persona, in tutte le edizioni. */
  function presenzeDi(chiave: string): number {
    return presenzeStat.filter((p) => p.chiave === chiave).length;
  }
  const datate = $derived(
    edizioni.filter((e) => e.data).sort((a, b) => (a.data! < b.data! ? 1 : -1)),
  );
  const senzaAccount = $derived([...segnaposto].sort((a, b) => a.nome.localeCompare(b.nome, 'it')));

  function nomePersona(chiave: string): string {
    return eSegnaposto(chiave)
      ? (nomeSegnaposto.get(chiave.slice(2)) ?? NOME_NON_DISPONIBILE)
      : (nomeAccount.get(chiave) ?? NOME_NON_DISPONIBILE);
  }

  const plurale = (n: number, singolare: string, plurale: string) =>
    `${n} ${n === 1 ? singolare : plurale}`;

  /** Legge edizioni, presenze, persone senza account e profili (una lettura, niente ascolto). */
  async function carica() {
    const [{ firebase }, f] = await Promise.all([
      import('$lib/firebase/app'),
      import('firebase/firestore'),
    ]);
    const db = firebase().db;
    const [ed, pr, sg, pf] = await Promise.all([
      f.getDocs(f.collection(db, 'edizioni')),
      f.getDocs(f.collectionGroup(db, 'presenze')),
      f.getDocs(f.collection(db, 'segnaposto')),
      f.getDocs(f.collection(db, 'profili')),
    ]);
    edizioni = ed.docs.map((d) => {
      const quando = d.get('quando') as { tipo?: string; data?: string } | undefined;
      return {
        id: d.id,
        nome: (d.get('nome') as string) ?? '',
        data: quando?.tipo === 'data' ? (quando.data ?? null) : null,
      };
    });
    presenzeGrezze = pr.docs.map((d) => ({
      edizione: d.ref.parent.parent?.id ?? '',
      uid: (d.get('uid') as string | null) ?? null,
      segnaposto: (d.get('segnaposto') as string | undefined) ?? null,
      nome: (d.get('nome') as string | undefined) ?? NOME_NON_DISPONIBILE,
    }));
    segnaposto = sg.docs.map((d) => ({
      id: d.id,
      nome: (d.get('nome') as string) ?? '',
      origine: (d.get('origine') as string) ?? '',
    }));
    account = pf.docs.map((d) => ({ uid: d.id, nome: (d.get('nome') as string) ?? '' }));
    caricato = true;
  }

  $effect(() => {
    if (!sessione.permessi.admin) return;
    let annullato = false;
    carica().catch(() => {
      if (!annullato)
        erroreCaricamento = 'Non sono riuscito a leggere le presenze. Ricarica la pagina.';
    });
    return () => {
      annullato = true;
    };
  });

  /** Esegue un'azione del pannello, mostra l'esito e ricarica i dati. */
  async function esegui(operazione: () => Promise<string>) {
    inCorso = true;
    errore = '';
    conferma = '';
    try {
      conferma = await operazione();
      await carica();
    } catch (e) {
      const codice = (e as { code?: string }).code;
      errore =
        codice === 'functions/invalid-argument' || codice === 'functions/failed-precondition'
          ? ((e as { message?: string }).message ?? NON_SALVATO)
          : NON_SALVATO;
    } finally {
      inCorso = false;
    }
  }

  async function aggiungi(evento: SubmitEvent) {
    evento.preventDefault();
    const nome = nuovaPersona.trim().replace(/\s+/g, ' ');
    erroreNuova = erroreNomeOspite(nome) ?? '';
    if (erroreNuova) return;
    await esegui(async () => {
      await creaSegnaposto(nome);
      nuovaPersona = '';
      return `${nome} è stato aggiunto.`;
    });
  }

  async function salvaNome(persona: SegnapostoNelPannello) {
    const nome = nuovoNome.trim().replace(/\s+/g, ' ');
    const messaggio = erroreNomeOspite(nome);
    if (messaggio) {
      errore = messaggio;
      return;
    }
    await esegui(async () => {
      await rinominaSegnaposto(persona.id, nome);
      azione = null;
      return 'Nome cambiato.';
    });
  }

  async function aggiungiAllaEdizione(persona: SegnapostoNelPannello) {
    if (!edizioneScelta) return;
    await esegui(async () => {
      const { esito } = await aggiungiPresenza(edizioneScelta, { segnaposto: persona.id });
      return esito === 'gia-presente'
        ? 'Questa persona risulta già presente.'
        : 'Presenza aggiunta.';
    });
  }

  async function eliminaDefinitivo() {
    const persona = daEliminare;
    dialogoElimina?.close();
    if (!persona) return;
    await esegui(async () => {
      await cancellaSegnaposto(persona.id);
      daEliminare = null;
      if (azione?.id === persona.id) azione = null;
      return `Eliminato: ${persona.nome}.`;
    });
  }

  async function collegaDefinitivo() {
    const scelta = daCollegare;
    dialogoCollega?.close();
    if (!scelta) return;
    await esegui(async () => {
      const esito = await collegaSegnaposto(scelta.segnaposto.id, scelta.account.uid);
      daCollegare = null;
      azione = null;
      return esito.giaPresenti > 0
        ? `Collegamento fatto. Edizioni in cui l'account era già presente: ${esito.giaPresenti}.`
        : 'Collegamento fatto.';
    });
  }

  function scegliAccount(persona: SegnapostoNelPannello) {
    const scelto = account.find((a) => a.uid === accountScelto);
    if (!scelto) return;
    daCollegare = { segnaposto: persona, account: scelto };
    dialogoCollega?.showModal();
  }

  function apri(tipo: Azione['tipo'], persona: SegnapostoNelPannello) {
    errore = '';
    conferma = '';
    azione = { tipo, id: persona.id };
    if (tipo === 'rinomina') nuovoNome = persona.nome;
    if (tipo === 'presenza') edizioneScelta = datate[0]?.id ?? '';
    if (tipo === 'collega') accountScelto = account[0]?.uid ?? '';
  }

  const ORIGINE: Record<string, string> = { ospite: 'ospite', storico: "dall'archivio" };
</script>

<PaginaAccount titolo="Presenze" etichetta="Pannello admin">
  {#if sessione.permessi.admin}<SchedePannello />{/if}

  {#if sessione.stato === 'caricamento'}
    <p class="attenuato" role="status">Un momento…</p>
  {:else if !sessione.permessi.admin}
    <p class="attenuato">Questa pagina è riservata agli admin.</p>
    <p><a href={resolve('/profilo')}>Torna al profilo</a></p>
  {:else if erroreCaricamento}
    <p class="errore" role="alert">{erroreCaricamento}</p>
  {:else if !caricato}
    <p class="attenuato" role="status">Carico le presenze…</p>
  {:else}
    <Scheda>
      <h2 class="sezione">Panoramica</h2>
      {#if datate.length === 0}
        <p class="attenuato">Nessuna edizione con data.</p>
      {:else}
        <div class="tabella">
          <table>
            <thead>
              <tr>
                <th scope="col">Edizione</th>
                <th scope="col">Presenti</th>
                <th scope="col">Con account</th>
                <th scope="col">Senza account</th>
                <th scope="col">Nuove leve</th>
              </tr>
            </thead>
            <tbody>
              {#each statistiche.perEdizione as riga (riga.id)}
                <tr>
                  <th scope="row"
                    >{riga.nome} <span class="attenuato">{riga.data.slice(0, 4)}</span></th
                  >
                  <td>{riga.presenti}</td>
                  <td>{riga.account}</td>
                  <td>{riga.senzaAccount}</td>
                  <td>{riga.nuoveLeve}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </Scheda>

    <Scheda>
      <h2 class="sezione">Fedelissimi</h2>
      {#if statistiche.fedelissimi.length === 0}
        <p class="attenuato">Nessuna presenza ancora.</p>
      {:else}
        <ol class="fedelissimi">
          {#each statistiche.fedelissimi as persona (persona.chiave)}
            <li>
              <span class="persona">{nomePersona(persona.chiave) || 'Senza nome'}</span>
              {#if eSegnaposto(persona.chiave)}<span class="etichetta">senza account</span>{/if}
              <span class="attenuato">{plurale(persona.presenze, 'presenza', 'presenze')}</span>
            </li>
          {/each}
        </ol>
      {/if}
    </Scheda>

    <Scheda>
      <h2 class="sezione">Senza account</h2>
      <form class="modulo" novalidate onsubmit={aggiungi}>
        <h3 class="sottotitolo">Aggiungi persona</h3>
        <div class="campo">
          <label for="nuova-persona">Nome</label>
          <input
            id="nuova-persona"
            type="text"
            maxlength="60"
            autocomplete="off"
            bind:value={nuovaPersona}
            aria-invalid={erroreNuova ? 'true' : undefined}
            aria-describedby={erroreNuova ? 'errore-nuova' : undefined}
          />
          {#if erroreNuova}<p id="errore-nuova" class="errore" role="alert">{erroreNuova}</p>{/if}
        </div>
        <div class="azioni">
          <Bottone type="submit" disabled={inCorso}>Aggiungi</Bottone>
        </div>
      </form>

      {#if errore}<p class="errore" role="alert">{errore}</p>{/if}
      {#if conferma}<p class="conferma" role="status">{conferma}</p>{/if}

      {#if senzaAccount.length === 0}
        <p class="attenuato">Nessuna persona senza account.</p>
      {:else}
        <ul class="persone" aria-label="Persone senza account">
          {#each senzaAccount as persona (persona.id)}
            <li>
              <div class="riga">
                <span class="persona">{persona.nome}</span>
                <span class="attenuato">
                  {plurale(presenzeDi(chiaveSegnaposto(persona.id)), 'presenza', 'presenze')}
                  · {ORIGINE[persona.origine] ?? persona.origine}
                </span>
              </div>
              <div class="azioni">
                <Bottone
                  type="button"
                  variante="secondario"
                  disabled={inCorso}
                  onclick={() => apri('rinomina', persona)}>Rinomina</Bottone
                >
                <Bottone
                  type="button"
                  variante="secondario"
                  disabled={inCorso}
                  onclick={() => apri('presenza', persona)}>Aggiungi presenza</Bottone
                >
                <Bottone
                  type="button"
                  variante="secondario"
                  disabled={inCorso || account.length === 0}
                  onclick={() => apri('collega', persona)}>Collega a un account</Bottone
                >
                <Bottone
                  type="button"
                  variante="pericolo"
                  disabled={inCorso}
                  onclick={() => {
                    daEliminare = persona;
                    dialogoElimina?.showModal();
                  }}
                >
                  Elimina
                </Bottone>
              </div>

              {#if azione?.id === persona.id && azione.tipo === 'rinomina'}
                <form
                  class="pannello"
                  novalidate
                  onsubmit={(e) => {
                    e.preventDefault();
                    void salvaNome(persona);
                  }}
                >
                  <div class="campo">
                    <label for="nome-{persona.id}">Nuovo nome</label>
                    <input
                      id="nome-{persona.id}"
                      type="text"
                      maxlength="60"
                      autocomplete="off"
                      bind:value={nuovoNome}
                    />
                  </div>
                  <div class="azioni">
                    <Bottone type="submit" disabled={inCorso}>Salva</Bottone>
                    <Bottone type="button" variante="secondario" onclick={() => (azione = null)}
                      >Chiudi</Bottone
                    >
                  </div>
                </form>
              {:else if azione?.id === persona.id && azione.tipo === 'presenza'}
                <form
                  class="pannello"
                  novalidate
                  onsubmit={(e) => {
                    e.preventDefault();
                    void aggiungiAllaEdizione(persona);
                  }}
                >
                  {#if datate.length === 0}
                    <p class="attenuato">Non ci sono edizioni con data.</p>
                  {:else}
                    <div class="campo">
                      <label for="edizione-{persona.id}">Edizione</label>
                      <select id="edizione-{persona.id}" bind:value={edizioneScelta}>
                        {#each datate as e (e.id)}
                          <option value={e.id}>{e.nome} · {e.data?.slice(0, 4)}</option>
                        {/each}
                      </select>
                    </div>
                    <div class="azioni">
                      <Bottone type="submit" disabled={inCorso}>Aggiungi</Bottone>
                      <Bottone type="button" variante="secondario" onclick={() => (azione = null)}
                        >Chiudi</Bottone
                      >
                    </div>
                  {/if}
                </form>
              {:else if azione?.id === persona.id && azione.tipo === 'collega'}
                <form
                  class="pannello"
                  novalidate
                  onsubmit={(e) => {
                    e.preventDefault();
                    scegliAccount(persona);
                  }}
                >
                  <div class="campo">
                    <label for="account-{persona.id}">Account</label>
                    <select id="account-{persona.id}" bind:value={accountScelto}>
                      {#each account as a (a.uid)}
                        <option value={a.uid}>{a.nome}</option>
                      {/each}
                    </select>
                  </div>
                  <div class="azioni">
                    <Bottone type="submit" disabled={inCorso}>Continua</Bottone>
                    <Bottone type="button" variante="secondario" onclick={() => (azione = null)}
                      >Chiudi</Bottone
                    >
                  </div>
                </form>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </Scheda>

    <dialog bind:this={dialogoCollega} aria-labelledby="titolo-collega">
      <h2 id="titolo-collega">
        Collegare {daCollegare?.segnaposto.nome ?? ''} all'account di {daCollegare?.account.nome ??
          ''}?
      </h2>
      <p class="attenuato">
        Le presenze passano all'account e la persona senza account viene eliminata. Non si può
        annullare.
      </p>
      <div class="azioni">
        <Bottone variante="secondario" onclick={() => dialogoCollega?.close()}>Annulla</Bottone>
        <Bottone variante="pericolo" disabled={inCorso} onclick={collegaDefinitivo}>Collega</Bottone
        >
      </div>
    </dialog>

    <dialog bind:this={dialogoElimina} aria-labelledby="titolo-elimina">
      <h2 id="titolo-elimina">
        Eliminare {daEliminare?.nome ?? ''} e le sue presenze? Non si può annullare.
      </h2>
      <div class="azioni">
        <Bottone variante="secondario" onclick={() => dialogoElimina?.close()}>Annulla</Bottone>
        <Bottone variante="pericolo" disabled={inCorso} onclick={eliminaDefinitivo}>Elimina</Bottone
        >
      </div>
    </dialog>
  {/if}
</PaginaAccount>

<style>
  p {
    margin: 0;
  }
  .sezione {
    font-size: var(--testo-l);
  }
  .sottotitolo {
    font-size: var(--testo-m);
  }
  .tabella {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--testo-s);
  }
  th,
  td {
    text-align: left;
    padding: var(--spazio-2);
    border-bottom: 1px solid var(--colore-accento-scuro);
    white-space: nowrap;
  }
  td {
    font-variant-numeric: tabular-nums;
  }
  .fedelissimi {
    margin: 0;
    padding-left: var(--spazio-5);
    display: grid;
    gap: var(--spazio-1);
  }
  .persone {
    list-style: none;
    padding: 0;
    display: grid;
    gap: var(--spazio-3);
  }
  .riga {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spazio-2);
    align-items: baseline;
  }
  .persona {
    font-weight: 600;
  }
  .etichetta {
    font-size: var(--testo-s);
    color: var(--colore-testo-attenuato);
    font-style: italic;
  }
  .modulo,
  .pannello {
    display: grid;
    gap: var(--spazio-3);
  }
  .campo {
    display: grid;
    gap: var(--spazio-1);
  }
  label {
    font-weight: 700;
    font-size: var(--testo-s);
  }
  input,
  select {
    width: 100%;
    box-sizing: border-box;
    border: 0;
    border-radius: var(--raggio-s);
    padding: var(--spazio-2);
    background: var(--colore-campo);
    color: var(--colore-testo);
    font: inherit;
  }
  .azioni {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spazio-2);
  }
  .errore {
    font-size: var(--testo-s);
    font-weight: 700;
    color: var(--colore-secondario);
  }
  .conferma {
    color: var(--colore-conferma);
    font-weight: 700;
  }
</style>
