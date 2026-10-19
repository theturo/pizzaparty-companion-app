<script lang="ts">
  // Una richiesta di account nel pannello admin, con il contesto per decidere (D-009).
  import Scheda from './Scheda.svelte';
  import Bottone from './Bottone.svelte';
  import ImmagineAvatar from './ImmagineAvatar.svelte';
  import { messaggioErrore } from '$lib/account/errori';

  export interface Richiesta {
    uid: string;
    email: string | null;
    nome: string;
    avatar: string;
    invitatoDa: {
      testo: string | null;
      codice: string | null;
      nome: string | null;
      codiceValido: boolean | null;
    };
    creato: Date | null;
  }

  let { richiesta }: { richiesta: Richiesta } = $props();
  let confermaRifiuto = $state(false);
  let inCorso = $state(false);
  let errore = $state('');

  const invito = $derived.by(() => {
    const i = richiesta.invitatoDa;
    if (i.codice && i.nome) return `Invitato da ${i.nome} (link d'invito)`;
    if (i.codice) return "Link d'invito non valido o rigenerato";
    if (i.testo) return `Dice di essere invitato da: «${i.testo}»`;
    return 'Nessun invito indicato';
  });

  async function esegui(azione: 'approva' | 'rifiuta') {
    inCorso = true;
    errore = '';
    try {
      const azioni = await import('$lib/account/azioni');
      if (azione === 'approva') await azioni.approvaRichiesta(richiesta.uid);
      else await azioni.rifiutaRichiesta(richiesta.uid);
      // La scheda sparisce da sola: la richiesta viene cancellata dalle Functions.
    } catch (e) {
      errore = messaggioErrore(e);
      inCorso = false;
    }
  }
</script>

<Scheda>
  <div class="intestazione">
    <ImmagineAvatar id={richiesta.avatar} dimensione={48} />
    <div>
      <p class="nome">{richiesta.nome}</p>
      <p class="attenuato">{richiesta.email ?? 'email non disponibile'}</p>
    </div>
  </div>
  <p class:avviso={richiesta.invitatoDa.codice && !richiesta.invitatoDa.nome}>{invito}</p>
  {#if richiesta.creato}
    <p class="attenuato">
      Richiesta del {richiesta.creato.toLocaleString('it-IT', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })}
    </p>
  {/if}
  {#if errore}<p class="messaggio-errore" role="alert">{errore}</p>{/if}
  <div class="azioni">
    {#if confermaRifiuto}
      <Bottone variante="secondario" disabled={inCorso} onclick={() => (confermaRifiuto = false)}>
        Annulla
      </Bottone>
      <Bottone disabled={inCorso} onclick={() => esegui('rifiuta')}>
        Conferma: rifiuta e cancella
      </Bottone>
    {:else}
      <Bottone variante="secondario" disabled={inCorso} onclick={() => (confermaRifiuto = true)}>
        Rifiuta
      </Bottone>
      <Bottone disabled={inCorso} onclick={() => esegui('approva')}>Approva</Bottone>
    {/if}
  </div>
</Scheda>

<style>
  .intestazione {
    display: flex;
    gap: var(--spazio-3);
    align-items: center;
  }
  p {
    margin: 0;
  }
  .nome {
    font-weight: 700;
    font-size: var(--testo-l);
  }
  .avviso {
    color: var(--colore-evidenza);
  }
  .azioni {
    display: flex;
    gap: var(--spazio-2);
    justify-content: flex-end;
    flex-wrap: wrap;
  }
</style>
