<script lang="ts">
  // Lo scanner del QR d'ingresso dentro l'app (D-064): iOS e, in parte, Android non lasciano che la
  // fotocamera del telefono apra il link quando l'app è installata. Qui la lettura si fa da sola.
  import { onDestroy, onMount } from 'svelte';
  import { codiceDaQr } from '$lib/edizioni/checkin';

  let {
    onCodice,
    onAnnulla,
  }: {
    /** Chiamata con il codice del primo QR nostro letto. Lo scanner si è già fermato. */
    onCodice: (codice: string) => void;
    /** Chiamata quando la persona chiude lo scanner (Annulla o Esc). */
    onAnnulla: () => void;
  } = $props();

  const MSG_NEGATO =
    'Serve il permesso per la fotocamera. Puoi darlo dalle impostazioni del telefono, oppure inquadra il QR con la fotocamera del telefono.';
  const MSG_NON_DISPONIBILE = 'Fotocamera non disponibile su questo dispositivo.';
  const MSG_ESTRANEO = 'Questo QR non è del PizzaParty.';
  /** Letture al secondo con la libreria di riserva (jsQR). */
  const INTERVALLO_MS = 125;

  // BarcodeDetector non è nei tipi della libreria DOM: si descrive solo quello che serve.
  interface RilevatoreCodici {
    detect(sorgente: HTMLVideoElement): Promise<{ rawValue: string }[]>;
  }
  type CostruttoreRilevatore = new (opzioni: { formats: string[] }) => RilevatoreCodici;
  type Lettore = (sorgente: HTMLVideoElement) => Promise<string | null>;

  let dialogo = $state<HTMLDialogElement>();
  let video = $state<HTMLVideoElement>();
  let tela = $state<HTMLCanvasElement>();
  let titoloId = `titolo-scanner-${Math.random().toString(36).slice(2, 8)}`;

  let avviso = $state('Apro la fotocamera…');
  let errore = $state<string | null>(null);

  let flusso: MediaStream | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  let lettore: Lettore | undefined;
  let occupato = false;
  let finito = false;

  /** Ferma la fotocamera e il ciclo di lettura. Si può chiamare più volte. */
  function fermaTutto() {
    finito = true;
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
    flusso?.getTracks().forEach((traccia) => traccia.stop());
    flusso = null;
    if (video) video.srcObject = null;
  }

  async function creaLettore(): Promise<Lettore> {
    const Rilevatore = (window as unknown as { BarcodeDetector?: CostruttoreRilevatore })
      .BarcodeDetector;
    if (Rilevatore) {
      const rilevatore = new Rilevatore({ formats: ['qr_code'] });
      return async (sorgente) => (await rilevatore.detect(sorgente))[0]?.rawValue ?? null;
    }
    // Riserva: jsQR sui fotogrammi di un canvas, nel browser e senza rete.
    const { default: jsQR } = await import('jsqr');
    return async (sorgente) => {
      const ctx = tela?.getContext('2d', { willReadFrequently: true });
      if (!tela || !ctx || sorgente.videoWidth === 0) return null;
      const { videoWidth: w, videoHeight: h } = sorgente;
      if (tela.width !== w || tela.height !== h) {
        tela.width = w;
        tela.height = h;
      }
      ctx.drawImage(sorgente, 0, 0, w, h);
      const immagine = ctx.getImageData(0, 0, w, h);
      return jsQR(immagine.data, w, h, { inversionAttempts: 'dontInvert' })?.data ?? null;
    };
  }

  async function avvia() {
    if (!navigator.mediaDevices?.getUserMedia) {
      errore = MSG_NON_DISPONIBILE;
      return;
    }
    try {
      const nuovo = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      if (finito) {
        nuovo.getTracks().forEach((traccia) => traccia.stop());
        return;
      }
      flusso = nuovo;
    } catch (causa) {
      const nome = (causa as DOMException | undefined)?.name;
      errore =
        nome === 'NotAllowedError' || nome === 'SecurityError' ? MSG_NEGATO : MSG_NON_DISPONIBILE;
      return;
    }
    if (!video) return;
    video.srcObject = flusso;
    await video.play().catch(() => {
      // L'autoplay è muto e in linea: se il browser lo rifiuta, il fotogramma arriva lo stesso.
    });
    lettore = await creaLettore();
    if (finito) return;
    avviso = 'Inquadra il QR: si legge da solo.';
    timer = setInterval(leggi, INTERVALLO_MS);
  }

  async function leggi() {
    if (occupato || finito || !lettore || !video || video.readyState < 2) return;
    occupato = true;
    try {
      const testo = await lettore(video);
      if (finito) return;
      if (testo === null) {
        avviso = 'Inquadra il QR: si legge da solo.';
        return;
      }
      const codice = codiceDaQr(testo, window.location.origin);
      if (codice === null) {
        avviso = MSG_ESTRANEO;
        return;
      }
      fermaTutto();
      onCodice(codice);
    } catch {
      // Un fotogramma illeggibile non è un errore: si riprova al giro dopo.
    } finally {
      occupato = false;
    }
  }

  function annulla() {
    fermaTutto();
    onAnnulla();
  }

  onMount(() => {
    dialogo?.showModal();
    void avvia();
  });

  // Anche smontando il componente (per esempio cambiando pagina) la fotocamera si spegne.
  onDestroy(fermaTutto);
</script>

<dialog
  bind:this={dialogo}
  class="scanner"
  aria-labelledby={titoloId}
  oncancel={(evento) => {
    evento.preventDefault();
    annulla();
  }}
>
  <div class="contenuto">
    <h2 id={titoloId} class="titolo">Inquadra il QR all'ingresso</h2>

    <div class="schermo">
      {#if errore === null}
        <video bind:this={video} class="video" playsinline muted autoplay></video>
        <canvas bind:this={tela} class="tela" aria-hidden="true"></canvas>
        <div class="mira" aria-hidden="true"></div>
      {/if}
    </div>

    {#if errore !== null}
      <p class="errore" role="alert">{errore}</p>
    {:else}
      <p class="avviso" role="status">{avviso}</p>
    {/if}

    <button class="annulla" type="button" onclick={annulla}>Annulla</button>
  </div>
</dialog>

<style>
  .scanner {
    width: 100dvw;
    max-width: none;
    height: 100dvh;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    background: var(--colore-sfondo);
    color: var(--colore-testo);
  }
  .scanner::backdrop {
    background: var(--colore-sfondo);
  }
  .contenuto {
    height: 100%;
    display: grid;
    grid-template-rows: auto 1fr auto auto;
    gap: var(--spazio-3);
    justify-items: center;
    padding: calc(var(--spazio-4) + env(safe-area-inset-top)) var(--spazio-4)
      calc(var(--spazio-4) + env(safe-area-inset-bottom));
    box-sizing: border-box;
    text-align: center;
  }
  .titolo {
    margin: 0;
    font-family: var(--font-titoli);
    font-style: var(--titoli-stile);
    font-weight: var(--titoli-peso);
    font-size: var(--testo-l);
    color: var(--colore-accento);
  }
  .schermo {
    position: relative;
    width: 100%;
    min-height: 0;
    overflow: hidden;
    border-radius: var(--raggio-m);
    background: var(--colore-campo);
    display: grid;
    place-items: center;
  }
  .video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .tela {
    display: none;
  }
  /* Riquadro di mira: solo grafica. Il resto dello schermo si scurisce attorno a lui. */
  .mira {
    position: absolute;
    width: min(64vmin, 70%);
    aspect-ratio: 1;
    border: 3px solid var(--colore-accento);
    border-radius: var(--raggio-m);
    box-shadow: 0 0 0 100vmax rgb(0 0 0 / 0.45);
    pointer-events: none;
  }
  .avviso,
  .errore {
    margin: 0;
    max-width: 30rem;
  }
  .avviso {
    color: var(--colore-testo-attenuato);
  }
  .errore {
    color: var(--colore-evidenza);
    font-weight: 600;
  }
  .annulla {
    border: 0;
    border-radius: var(--raggio-s);
    padding: var(--spazio-2) var(--spazio-5);
    font: inherit;
    font-weight: 700;
    background: var(--colore-superficie);
    color: var(--colore-testo);
    cursor: pointer;
  }
  .annulla:active {
    transform: scale(0.96);
  }
</style>
