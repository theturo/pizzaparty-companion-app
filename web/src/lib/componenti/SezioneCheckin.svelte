<script lang="ts">
  // Check-in con il link nel pannello (D-058): QR e codice dell'edizione, presenze in ascolto,
  // annullamento di una presenza. Il QR si genera nel browser (libreria qrcode, niente servizi esterni).
  import QRCode from 'qrcode';
  import Bottone from '$lib/componenti/Bottone.svelte';
  import Scheda from '$lib/componenti/Scheda.svelte';
  import { generaCodiceCheckin } from '$lib/account/azioni';
  import { oraRoma } from '$lib/edizioni/checkin';

  let { id, nome }: { id: string; nome: string } = $props();

  /** Il link che il QR d'ingresso apre (il sito è statico: la pagina è una query, non una rotta). */
  const LINK_CHECKIN = 'https://app.pizza-party.net/checkin';

  // undefined = non ancora letto; null = il codice non c'è ancora; altrimenti il codice.
  let codice = $state<string | null | undefined>(undefined);
  let presenze = $state<{ uid: string; registrata: Date }[] | null>(null);
  let nomi = $state<Record<string, string>>({});
  let svgQr = $state('');
  let errore = $state('');
  let inCorso = $state(false);
  let daAnnullare = $state<{ uid: string; nome: string } | null>(null);
  let dialogoRigenera = $state<HTMLDialogElement>();
  let dialogoAnnulla = $state<HTMLDialogElement>();

  const link = $derived(codice ? `${LINK_CHECKIN}?c=${codice}` : null);

  // Il QR in linea (SVG) per la pagina; la versione grande si genera solo quando si scarica.
  $effect(() => {
    const testo = link;
    svgQr = '';
    if (!testo) return;
    let annullato = false;
    QRCode.toString(testo, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then((svg) => {
      if (!annullato) svgQr = svg;
    });
    return () => {
      annullato = true;
    };
  });

  // Il codice e le presenze si leggono solo con il permesso admin (regole, D-058).
  $effect(() => {
    let smettiCodice: (() => void) | undefined;
    let smettiPresenze: (() => void) | undefined;
    let annullato = false;
    (async () => {
      const [{ firebase }, { collection, doc, getDoc, onSnapshot }] = await Promise.all([
        import('$lib/firebase/app'),
        import('firebase/firestore'),
      ]);
      if (annullato) return;
      const db = firebase().db;
      smettiCodice = onSnapshot(doc(db, 'edizioni', id, 'riservato', 'checkin'), (s) => {
        codice = s.exists() ? (s.get('codice') as string) : null;
      });
      smettiPresenze = onSnapshot(collection(db, 'edizioni', id, 'presenze'), (istantanea) => {
        const elenco = istantanea.docs.map((d) => ({
          uid: d.id,
          registrata:
            (d.get('registrata') as { toDate(): Date } | undefined)?.toDate() ?? new Date(),
        }));
        presenze = elenco.sort((a, b) => a.registrata.getTime() - b.registrata.getTime());
        // I nomi stanno nei profili pubblici: si leggono una volta per persona.
        for (const { uid } of elenco) {
          if (nomi[uid] !== undefined) continue;
          getDoc(doc(db, 'profili', uid)).then((profilo) => {
            nomi[uid] = (profilo.get('nome') as string | undefined) ?? 'Nome non disponibile';
          });
        }
      });
    })();
    return () => {
      annullato = true;
      smettiCodice?.();
      smettiPresenze?.();
    };
  });

  async function generaNuovo() {
    dialogoRigenera?.close();
    inCorso = true;
    errore = '';
    try {
      const risposta = await generaCodiceCheckin(id);
      codice = risposta.codice;
    } catch {
      errore = 'Non sono riuscito a generare il codice. Riprova tra poco.';
    } finally {
      inCorso = false;
    }
  }

  async function scaricaQr() {
    if (!link) return;
    const QR = await QRCode.toDataURL(link, { width: 1200, margin: 4, errorCorrectionLevel: 'M' });
    const a = document.createElement('a');
    a.href = QR;
    a.download = `qr-checkin-${id}.png`;
    a.click();
  }

  async function annullaPresenza() {
    if (!daAnnullare) return;
    const { uid } = daAnnullare;
    dialogoAnnulla?.close();
    inCorso = true;
    errore = '';
    try {
      const [{ firebase }, { deleteDoc, doc }] = await Promise.all([
        import('$lib/firebase/app'),
        import('firebase/firestore'),
      ]);
      await deleteDoc(doc(firebase().db, 'edizioni', id, 'presenze', uid));
    } catch {
      errore = 'Non sono riuscito ad annullare la presenza. Riprova tra poco.';
    } finally {
      inCorso = false;
      daAnnullare = null;
    }
  }
</script>

<Scheda>
  <h2 class="titolo">Check-in e presenze</h2>

  {#if codice === undefined}
    <p class="attenuato" role="status">Carico il codice…</p>
  {:else if codice === null}
    <p class="attenuato">
      Il QR d'ingresso non c'è ancora. Generalo e stampalo per l'ingresso della festa.
    </p>
    <div class="azioni">
      <Bottone type="button" disabled={inCorso} onclick={generaNuovo}>Genera il codice</Bottone>
    </div>
  {:else if link}
    <div class="qr" role="img" aria-label="QR del link di check-in di {nome}">
      <!-- SVG generato qui dalla libreria: niente di esterno né di utente in questo markup. -->
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html svgQr}
    </div>
    <p class="link">
      <span class="attenuato">Link</span>
      <code>{link}</code>
    </p>
    <div class="azioni">
      <Bottone type="button" variante="secondario" onclick={scaricaQr}>Scarica il QR</Bottone>
      <Bottone
        type="button"
        variante="secondario"
        disabled={inCorso}
        onclick={() => dialogoRigenera?.showModal()}
      >
        Genera un nuovo codice
      </Bottone>
    </div>
  {/if}

  {#if errore}<p class="errore" role="alert">{errore}</p>{/if}

  <h3 class="sottotitolo">Presenti: {presenze?.length ?? 0}</h3>
  {#if presenze === null}
    <p class="attenuato" role="status">Carico le presenze…</p>
  {:else if presenze.length === 0}
    <p class="attenuato">Nessuno ancora.</p>
  {:else}
    <ul class="presenti">
      {#each presenze as presenza (presenza.uid)}
        <li>
          <span class="persona">{nomi[presenza.uid] ?? '…'}</span>
          <span class="ora">{oraRoma(presenza.registrata)}</span>
          <Bottone
            type="button"
            variante="secondario"
            disabled={inCorso}
            onclick={() => {
              daAnnullare = { uid: presenza.uid, nome: nomi[presenza.uid] ?? 'questa persona' };
              dialogoAnnulla?.showModal();
            }}
          >
            Annulla la presenza
          </Bottone>
        </li>
      {/each}
    </ul>
  {/if}
</Scheda>

<dialog bind:this={dialogoRigenera} aria-labelledby="titolo-rigenera">
  <h2 id="titolo-rigenera">Generare un nuovo codice?</h2>
  <p class="attenuato">Il QR già stampato smetterà di funzionare. Continuare?</p>
  <div class="azioni">
    <Bottone variante="secondario" onclick={() => dialogoRigenera?.close()}>Indietro</Bottone>
    <Bottone variante="pericolo" disabled={inCorso} onclick={generaNuovo}>Genera</Bottone>
  </div>
</dialog>

<dialog bind:this={dialogoAnnulla} aria-labelledby="titolo-annulla">
  <h2 id="titolo-annulla">Annullare la presenza di {daAnnullare?.nome ?? 'questa persona'}?</h2>
  <p class="attenuato">
    La presenza si toglie dallo storico. Si può registrare di nuovo con il QR.
  </p>
  <div class="azioni">
    <Bottone variante="secondario" onclick={() => dialogoAnnulla?.close()}>Indietro</Bottone>
    <Bottone variante="pericolo" disabled={inCorso} onclick={annullaPresenza}>
      Annulla la presenza
    </Bottone>
  </div>
</dialog>

<style>
  .titolo {
    font-size: var(--testo-l);
  }
  .sottotitolo {
    font-size: var(--testo-m);
    margin-top: var(--spazio-3);
  }
  .qr {
    width: min(100%, 16rem);
    margin: var(--spazio-3) auto;
    background: #fff;
    padding: var(--spazio-2);
    border-radius: var(--raggio-s);
  }
  .qr :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }
  .link {
    display: grid;
    gap: var(--spazio-1);
    word-break: break-all;
  }
  .azioni {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spazio-2);
    margin-top: var(--spazio-3);
  }
  .presenti {
    list-style: none;
    padding: 0;
    display: grid;
    gap: var(--spazio-2);
  }
  .presenti li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spazio-2);
  }
  .persona {
    font-weight: 600;
  }
  .ora {
    color: var(--colore-testo-attenuato);
  }
</style>
