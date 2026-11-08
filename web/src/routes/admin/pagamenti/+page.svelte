<script lang="ts">
  // Pannello admin: i link di pagamento, uguali per tutte le edizioni (D-055).
  // Stanno in impostazioni/pagamenti; li legge e li scrive solo l'admin (regole).
  import { resolve } from '$app/paths';
  import PaginaAccount from '$lib/componenti/PaginaAccount.svelte';
  import Bottone from '$lib/componenti/Bottone.svelte';
  import Scheda from '$lib/componenti/Scheda.svelte';
  import SchedePannello from '$lib/componenti/SchedePannello.svelte';
  import { sessione } from '$lib/account/sessione.svelte';
  import { validaLink } from '$lib/edizioni/edizione';

  const NON_SALVATO = 'Non sono riuscito a salvare. Riprova tra poco.';

  let caricato = $state(false);
  let paypal = $state('');
  let satispay = $state('');
  let errori = $state<{ paypal?: string; satispay?: string }>({});
  let confermato = $state(false);
  let erroreSalvataggio = $state('');
  let inCorso = $state(false);

  $effect(() => {
    if (!sessione.permessi.admin) return;
    let annullato = false;
    (async () => {
      try {
        const [{ firebase }, { doc, getDoc }] = await Promise.all([
          import('$lib/firebase/app'),
          import('firebase/firestore'),
        ]);
        const istantanea = await getDoc(doc(firebase().db, 'impostazioni', 'pagamenti'));
        if (annullato) return;
        const dati = istantanea.data();
        if (dati) {
          paypal = dati.paypal ?? '';
          satispay = dati.satispay ?? '';
        }
      } catch {
        if (!annullato)
          erroreSalvataggio = 'Non sono riuscito a leggere i link salvati. Ricarica la pagina.';
      } finally {
        if (!annullato) caricato = true;
      }
    })();
    return () => {
      annullato = true;
    };
  });

  async function salva(evento: SubmitEvent) {
    evento.preventDefault();
    const p = paypal.trim();
    const s = satispay.trim();
    errori = { paypal: validaLink(p) ?? undefined, satispay: validaLink(s) ?? undefined };
    confermato = false;
    erroreSalvataggio = '';
    if (errori.paypal || errori.satispay) return;

    inCorso = true;
    try {
      const [{ firebase }, firestore] = await Promise.all([
        import('$lib/firebase/app'),
        import('firebase/firestore'),
      ]);
      await firestore.setDoc(firestore.doc(firebase().db, 'impostazioni', 'pagamenti'), {
        paypal: p,
        satispay: s,
        aggiornato: firestore.serverTimestamp(),
      });
      paypal = p;
      satispay = s;
      confermato = true;
    } catch {
      erroreSalvataggio = NON_SALVATO;
    } finally {
      inCorso = false;
    }
  }
</script>

<PaginaAccount titolo="Gestione pagamenti" etichetta="Pannello admin">
  {#if sessione.permessi.admin}<SchedePannello />{/if}

  {#if sessione.stato === 'caricamento'}
    <p class="attenuato" role="status">Un momento…</p>
  {:else if !sessione.permessi.admin}
    <p class="attenuato">Questa pagina è riservata agli admin.</p>
    <p><a href={resolve('/profilo')}>Torna al profilo</a></p>
  {:else if !caricato}
    <p class="attenuato" role="status">Carico i link…</p>
  {:else}
    <Scheda>
      <p class="attenuato">
        Questi link serviranno per i pulsanti di pagamento, uguali per tutte le edizioni. In ogni
        edizione scegli quali metodi accettare.
      </p>
      <form class="modulo" novalidate onsubmit={salva}>
        <div class="campo">
          <label for="link-paypal">Link PayPal</label>
          <input
            id="link-paypal"
            type="url"
            maxlength="300"
            placeholder="https://www.paypal.me/…"
            autocomplete="off"
            bind:value={paypal}
            aria-invalid={errori.paypal ? 'true' : undefined}
            aria-describedby={errori.paypal ? 'errore-paypal' : undefined}
          />
          {#if errori.paypal}<p id="errore-paypal" class="errore" role="alert">
              {errori.paypal}
            </p>{/if}
        </div>

        <div class="campo">
          <label for="link-satispay">Link Satispay</label>
          <input
            id="link-satispay"
            type="url"
            maxlength="300"
            placeholder="https://…"
            autocomplete="off"
            bind:value={satispay}
            aria-invalid={errori.satispay ? 'true' : undefined}
            aria-describedby={errori.satispay ? 'errore-satispay' : undefined}
          />
          {#if errori.satispay}<p id="errore-satispay" class="errore" role="alert">
              {errori.satispay}
            </p>{/if}
        </div>

        {#if erroreSalvataggio}<p class="errore" role="alert">{erroreSalvataggio}</p>{/if}
        {#if confermato}<p class="conferma" role="status">Link salvati.</p>{/if}

        <div class="azioni">
          <Bottone type="submit" disabled={inCorso}>Salva</Bottone>
        </div>
      </form>
    </Scheda>
  {/if}
</PaginaAccount>

<style>
  p {
    margin: 0;
  }
  .modulo {
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
  input {
    width: 100%;
    box-sizing: border-box;
    border: 0;
    border-radius: var(--raggio-s);
    padding: var(--spazio-2);
    background: var(--colore-campo);
    color: var(--colore-testo);
    font: inherit;
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
  .azioni {
    display: flex;
    font-weight: 400;
    font-size: var(--testo-s);
  }
</style>
