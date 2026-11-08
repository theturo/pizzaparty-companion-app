<script lang="ts">
  // Pannello admin: le edizioni del PizzaParty (D-053, D-054). Elenco e modulo sulla stessa pagina:
  // il modulo sostituisce l'elenco, senza cambiare indirizzo (il sito è statico).
  // La vera protezione sono le regole (edizioni/ si scrive solo con il permesso "admin").
  import { resolve } from '$app/paths';
  import PaginaAccount from '$lib/componenti/PaginaAccount.svelte';
  import Bottone from '$lib/componenti/Bottone.svelte';
  import Scheda from '$lib/componenti/Scheda.svelte';
  import SchedePannello from '$lib/componenti/SchedePannello.svelte';
  import { sessione } from '$lib/account/sessione.svelte';
  import { TEMA_PREDEFINITO, TEMI } from '$lib/tema/temi';
  import {
    descriviQuando,
    ETICHETTE_STATO,
    validaEdizione,
    valoriIniziali,
    type CampoEdizione,
    type DatiEdizione,
    type Edizione,
    type Quando,
    type StatoEdizione,
  } from '$lib/edizioni/edizione';

  interface EdizioneNellElenco extends Edizione {
    id: string;
  }

  /** Come si presentano i campi del modulo: testi e numeri così come li scrive la persona. */
  interface Campi {
    nome: string;
    tipo: 'data' | 'periodo';
    giorno: string;
    periodo: string;
    tema: string;
    singolo: number | string | null;
    conAccompagnatore: number | string | null;
    paypal: boolean;
    satispay: boolean;
    contanti: boolean;
    stato: StatoEdizione;
  }

  const NON_SALVATO = 'Non sono riuscito a salvare. Riprova tra poco.';

  let edizioni = $state<EdizioneNellElenco[] | null>(null);
  let confermaSalvataggio = $state('');
  /** null = si vede l'elenco; altrimenti il modulo, per una nuova edizione (id null) o una da modificare. */
  let modulo = $state<{ id: string | null; statoOriginale: StatoEdizione } | null>(null);
  let campi = $state<Campi>(campiDa(valoriIniziali(TEMA_PREDEFINITO)));
  let errori = $state<Partial<Record<CampoEdizione, string>>>({});
  let erroreSalvataggio = $state('');
  let inCorso = $state(false);
  let dialogoAnnullamento = $state<HTMLDialogElement>();

  function campiDa(d: DatiEdizione): Campi {
    return {
      nome: d.nome,
      tipo: d.quando.tipo,
      giorno: d.quando.tipo === 'data' ? d.quando.data : '',
      periodo: d.quando.tipo === 'periodo' ? d.quando.periodo : '',
      tema: d.tema,
      singolo: d.quota.singolo,
      conAccompagnatore: d.quota.conAccompagnatore,
      paypal: d.pagamenti.paypal,
      satispay: d.pagamenti.satispay,
      contanti: d.pagamenti.contanti,
      stato: d.stato,
    };
  }

  /** Un campo numerico vuoto diventa NaN, così la validazione lo segnala come quota non valida. */
  function numero(valore: number | string | null): number {
    if (typeof valore === 'number') return valore;
    if (valore === null || valore.trim() === '') return NaN;
    return Number(valore);
  }

  function datiDa(c: Campi): DatiEdizione {
    const quando: Quando =
      c.tipo === 'data'
        ? { tipo: 'data', data: c.giorno }
        : { tipo: 'periodo', periodo: c.periodo.trim() };
    return {
      nome: c.nome.trim(),
      quando,
      tema: c.tema,
      quota: { singolo: numero(c.singolo), conAccompagnatore: numero(c.conAccompagnatore) },
      pagamenti: { paypal: c.paypal, satispay: c.satispay, contanti: c.contanti },
      stato: c.stato,
    };
  }

  $effect(() => {
    if (!sessione.permessi.admin) return;
    let smetti: (() => void) | undefined;
    let annullato = false;
    (async () => {
      const [{ firebase }, { collection, onSnapshot, orderBy, query }] = await Promise.all([
        import('$lib/firebase/app'),
        import('firebase/firestore'),
      ]);
      if (annullato) return;
      const elenco = query(collection(firebase().db, 'edizioni'), orderBy('creato', 'desc'));
      smetti = onSnapshot(elenco, (istantanea) => {
        edizioni = istantanea.docs.map((d) => ({ id: d.id, ...(d.data() as Edizione) }));
      });
    })();
    return () => {
      annullato = true;
      smetti?.();
    };
  });

  function apriNuova() {
    confermaSalvataggio = '';
    erroreSalvataggio = '';
    errori = {};
    campi = campiDa(valoriIniziali(TEMA_PREDEFINITO));
    modulo = { id: null, statoOriginale: 'bozza' };
  }

  function apriModifica(e: EdizioneNellElenco) {
    confermaSalvataggio = '';
    erroreSalvataggio = '';
    errori = {};
    campi = campiDa(e);
    modulo = { id: e.id, statoOriginale: e.stato };
  }

  function chiudi() {
    erroreSalvataggio = '';
    errori = {};
    modulo = null;
  }

  async function salva(evento: SubmitEvent) {
    evento.preventDefault();
    const dati = datiDa(campi);
    const trovati = validaEdizione(dati);
    errori = Object.fromEntries(trovati.map((e) => [e.campo, e.messaggio]));
    if (trovati.length > 0 || !modulo) return;

    inCorso = true;
    erroreSalvataggio = '';
    try {
      const [{ firebase }, firestore] = await Promise.all([
        import('$lib/firebase/app'),
        import('firebase/firestore'),
      ]);
      const db = firebase().db;
      if (modulo.id === null) {
        await firestore.addDoc(firestore.collection(db, 'edizioni'), {
          ...dati,
          creato: firestore.serverTimestamp(),
          aggiornato: firestore.serverTimestamp(),
        });
      } else {
        await firestore.updateDoc(firestore.doc(db, 'edizioni', modulo.id), {
          ...dati,
          aggiornato: firestore.serverTimestamp(),
        });
      }
      modulo = null;
      errori = {};
      confermaSalvataggio = 'Edizione salvata.';
    } catch {
      erroreSalvataggio = NON_SALVATO;
    } finally {
      inCorso = false;
    }
  }

  /** Annullare è cambiare lo stato in 'annullata': si può tornare indietro scegliendo un altro stato. */
  async function annulla() {
    if (!modulo?.id) return;
    dialogoAnnullamento?.close();
    inCorso = true;
    erroreSalvataggio = '';
    try {
      const [{ firebase }, firestore] = await Promise.all([
        import('$lib/firebase/app'),
        import('firebase/firestore'),
      ]);
      await firestore.updateDoc(firestore.doc(firebase().db, 'edizioni', modulo.id), {
        stato: 'annullata',
        aggiornato: firestore.serverTimestamp(),
      });
      modulo = null;
      confermaSalvataggio = 'Edizione salvata.';
    } catch {
      erroreSalvataggio = NON_SALVATO;
    } finally {
      inCorso = false;
    }
  }
</script>

<PaginaAccount titolo="Edizioni" etichetta="Pannello admin">
  {#if sessione.permessi.admin}<SchedePannello />{/if}

  {#if sessione.stato === 'caricamento'}
    <p class="attenuato" role="status">Un momento…</p>
  {:else if !sessione.permessi.admin}
    <p class="attenuato">Questa pagina è riservata agli admin.</p>
    <p><a href={resolve('/profilo')}>Torna al profilo</a></p>
  {:else if modulo}
    <Scheda>
      <h2 class="titolo-modulo">{modulo.id === null ? 'Nuova edizione' : campi.nome}</h2>
      <form class="modulo" novalidate onsubmit={salva}>
        <div class="campo">
          <label for="nome">Nome</label>
          <input
            id="nome"
            type="text"
            maxlength="60"
            placeholder="Primavera 2027"
            autocomplete="off"
            bind:value={campi.nome}
            aria-invalid={errori.nome ? 'true' : undefined}
            aria-describedby={errori.nome ? 'errore-nome' : undefined}
          />
          {#if errori.nome}<p id="errore-nome" class="errore" role="alert">{errori.nome}</p>{/if}
        </div>

        <fieldset class="campo">
          <legend>Quando</legend>
          <div class="scelte">
            <label
              ><input type="radio" name="tipo" value="data" bind:group={campi.tipo} /> Data esatta</label
            >
            <label
              ><input type="radio" name="tipo" value="periodo" bind:group={campi.tipo} /> Periodo</label
            >
          </div>
          {#if campi.tipo === 'data'}
            <label for="giorno">Giorno</label>
            <input
              id="giorno"
              type="date"
              bind:value={campi.giorno}
              aria-invalid={errori.giorno ? 'true' : undefined}
              aria-describedby={errori.giorno ? 'errore-giorno' : undefined}
            />
            {#if errori.giorno}<p id="errore-giorno" class="errore" role="alert">
                {errori.giorno}
              </p>{/if}
          {:else}
            <label for="periodo">Periodo</label>
            <input
              id="periodo"
              type="text"
              maxlength="40"
              placeholder="Maggio 2027"
              bind:value={campi.periodo}
              aria-invalid={errori.periodo ? 'true' : undefined}
              aria-describedby={errori.periodo ? 'errore-periodo' : undefined}
            />
            {#if errori.periodo}<p id="errore-periodo" class="errore" role="alert">
                {errori.periodo}
              </p>{/if}
          {/if}
        </fieldset>

        <div class="campo">
          <label for="tema">Tema</label>
          <select id="tema" bind:value={campi.tema}>
            {#each TEMI as tema (tema.id)}
              <option value={tema.id}>{tema.nome}</option>
            {/each}
          </select>
        </div>

        <fieldset class="campo">
          <legend>Quota</legend>
          <div class="coppia">
            <div>
              <label for="quota-singolo">Da soli (€)</label>
              <input
                id="quota-singolo"
                type="number"
                inputmode="numeric"
                min="0"
                max="100"
                step="1"
                bind:value={campi.singolo}
                aria-invalid={errori.quota ? 'true' : undefined}
                aria-describedby={errori.quota ? 'errore-quota' : undefined}
              />
            </div>
            <div>
              <label for="quota-accompagnatore">Con +1 (€)</label>
              <input
                id="quota-accompagnatore"
                type="number"
                inputmode="numeric"
                min="0"
                max="100"
                step="1"
                bind:value={campi.conAccompagnatore}
                aria-invalid={errori.quota ? 'true' : undefined}
                aria-describedby={errori.quota ? 'errore-quota' : undefined}
              />
            </div>
          </div>
          {#if errori.quota}<p id="errore-quota" class="errore" role="alert">{errori.quota}</p>{/if}
        </fieldset>

        <fieldset class="campo" aria-describedby="nota-pagamenti">
          <legend>Pagamenti accettati</legend>
          <div class="scelte">
            <label><input type="checkbox" bind:checked={campi.paypal} /> PayPal</label>
            <label><input type="checkbox" bind:checked={campi.satispay} /> Satispay</label>
            <label><input type="checkbox" bind:checked={campi.contanti} /> Contanti</label>
          </div>
          <p id="nota-pagamenti" class="nota">
            I pulsanti di pagamento arriveranno nell'app più avanti.
          </p>
        </fieldset>

        <div class="campo">
          <label for="stato">Stato</label>
          <select id="stato" bind:value={campi.stato} aria-describedby="nota-stato">
            <option value="bozza">Bozza</option>
            <option value="annunciata">Annunciata</option>
            <option value="conclusa">Conclusa</option>
            {#if campi.stato === 'annullata' || modulo.statoOriginale === 'annullata'}
              <option value="annullata">Annullata</option>
            {/if}
          </select>
          <p id="nota-stato" class="nota">Le bozze le vedi solo tu.</p>
        </div>

        {#if erroreSalvataggio}<p class="errore" role="alert">{erroreSalvataggio}</p>{/if}

        <div class="azioni">
          <Bottone type="submit" disabled={inCorso}>Salva</Bottone>
          <Bottone type="button" variante="secondario" disabled={inCorso} onclick={chiudi}>
            Chiudi
          </Bottone>
        </div>

        {#if modulo.id !== null && modulo.statoOriginale !== 'annullata'}
          <div class="annullamento">
            <Bottone
              type="button"
              variante="pericolo"
              disabled={inCorso}
              onclick={() => dialogoAnnullamento?.showModal()}
            >
              Annulla l'edizione
            </Bottone>
          </div>
        {/if}
      </form>
    </Scheda>

    <!-- Conferma prima di annullare (come per l'eliminazione dell'account, D-040). -->
    <dialog bind:this={dialogoAnnullamento} aria-labelledby="titolo-annullamento">
      <h2 id="titolo-annullamento">Vuoi davvero annullare {campi.nome.trim()}?</h2>
      <p class="attenuato">
        In Home comparirà l'avviso che l'edizione è annullata. Potrai comunque cambiare di nuovo lo
        stato.
      </p>
      <div class="azioni">
        <Bottone variante="secondario" onclick={() => dialogoAnnullamento?.close()}
          >Indietro</Bottone
        >
        <Bottone variante="pericolo" disabled={inCorso} onclick={annulla}
          >Annulla l'edizione</Bottone
        >
      </div>
    </dialog>
  {:else}
    <div class="intestazione">
      <Bottone onclick={apriNuova}>Nuova edizione</Bottone>
    </div>
    {#if confermaSalvataggio}<p class="conferma" role="status">{confermaSalvataggio}</p>{/if}

    {#if edizioni === null}
      <p class="attenuato" role="status">Carico le edizioni…</p>
    {:else if edizioni.length === 0}
      <p class="attenuato">Nessuna edizione. Crea la prima e accendi il forno.</p>
    {:else}
      <ul class="elenco">
        {#each edizioni as edizione (edizione.id)}
          <li>
            <Scheda>
              <p class="nome">{edizione.nome}</p>
              <p class="attenuato">{descriviQuando(edizione.quando)}</p>
              <p class="stato">{ETICHETTE_STATO[edizione.stato]}</p>
              <div class="azioni">
                <Bottone variante="secondario" onclick={() => apriModifica(edizione)}
                  >Modifica</Bottone
                >
              </div>
            </Scheda>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</PaginaAccount>

<style>
  .intestazione {
    display: flex;
    justify-content: flex-end;
  }
  .elenco {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--spazio-3);
  }
  .nome,
  .titolo-modulo {
    margin: 0;
    font-family: var(--font-titoli);
    font-size: var(--testo-l);
  }
  p {
    margin: 0;
  }
  .stato {
    font-weight: 700;
    color: var(--colore-accento);
  }
  .conferma {
    color: var(--colore-conferma);
    font-weight: 700;
  }
  .modulo {
    display: grid;
    gap: var(--spazio-3);
  }
  .campo {
    display: grid;
    gap: var(--spazio-1);
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }
  legend,
  label {
    font-weight: 700;
    font-size: var(--testo-s);
  }
  legend {
    padding: 0;
    margin-bottom: var(--spazio-1);
  }
  input[type='text'],
  input[type='date'],
  input[type='number'],
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
  .scelte {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spazio-2) var(--spazio-4);
    font-weight: 400;
  }
  .scelte label,
  .coppia label {
    font-weight: 400;
  }
  .coppia {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: var(--spazio-3);
  }
  .coppia > div {
    display: grid;
    gap: var(--spazio-1);
  }
  .nota {
    font-size: var(--testo-s);
    color: var(--colore-testo-attenuato);
  }
  .errore {
    font-size: var(--testo-s);
    font-weight: 700;
    color: var(--colore-secondario);
  }
  .azioni {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spazio-2);
    font-weight: 400;
    font-size: var(--testo-s);
  }
  .annullamento {
    display: flex;
    justify-content: flex-start;
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
</style>
