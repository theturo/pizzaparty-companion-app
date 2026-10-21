<script lang="ts">
  // Diritto di accesso e portabilità (D-035): pagina leggibile + file JSON, generati sul server.
  import { resolve } from '$app/paths';
  import PaginaAccount from '$lib/componenti/PaginaAccount.svelte';
  import Bottone from '$lib/componenti/Bottone.svelte';
  import Scheda from '$lib/componenti/Scheda.svelte';
  import { sessione } from '$lib/account/sessione.svelte';
  import { messaggioErrore } from '$lib/account/errori';

  type Dati = Record<string, unknown>;
  let dati = $state<Dati | null>(null);
  let errore = $state('');

  $effect(() => {
    if (sessione.stato !== 'connesso' || dati) return;
    (async () => {
      try {
        const { esportaMieiDati } = await import('$lib/account/azioni');
        dati = await esportaMieiDati();
      } catch (e) {
        errore = messaggioErrore(e);
      }
    })();
  });

  const SEZIONI: [string, string][] = [
    ['account', 'Account di accesso (gestito da Firebase Authentication)'],
    ['profilo', 'Profilo'],
    ['schedaPubblica', 'Scheda visibile agli altri approvati'],
    ['richiestaInAttesa', 'Richiesta in attesa (visibile solo ad Arturo)'],
    ['codiciInvito', "Codici d'invito"],
    ['dispositiviConNotifiche', 'Dispositivi con le notifiche attive'],
  ];

  /** Voci "etichetta: valore" leggibili, anche per oggetti annidati. */
  function voci(valore: unknown, prefisso = ''): [string, string][] {
    if (valore === null || valore === undefined) return [];
    if (typeof valore !== 'object') return [[prefisso || 'valore', String(valore)]];
    return Object.entries(valore as Record<string, unknown>).flatMap(([chiave, v]) => {
      const nome = prefisso ? `${prefisso} › ${chiave}` : chiave;
      return v !== null && typeof v === 'object' ? voci(v, nome) : [[nome, String(v ?? '—')]];
    });
  }

  function scarica() {
    const file = new Blob([JSON.stringify(dati, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = `pizzaparty-i-miei-dati-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
</script>

<PaginaAccount titolo="I tuoi dati" etichetta="Privacy">
  {#if sessione.stato === 'ospite'}
    <p><a href={resolve('/accedi')}>Accedi</a> per vedere i tuoi dati.</p>
  {:else if errore}
    <p class="messaggio-errore" role="alert">{errore}</p>
  {:else if !dati}
    <p class="attenuato" role="status">Raccolgo i tuoi dati…</p>
  {:else}
    <p class="attenuato">
      Questo è tutto ciò che l'app conserva su di te. Il file JSON contiene le stesse informazioni,
      in un formato leggibile anche da altri programmi.
    </p>
    <Bottone onclick={scarica}>Scarica i tuoi dati (JSON)</Bottone>
    {#each SEZIONI as [chiave, titolo] (chiave)}
      {@const elenco = voci(dati[chiave])}
      <Scheda>
        <p class="etichetta">{titolo}</p>
        {#if elenco.length === 0}
          <p class="attenuato">Nessun dato.</p>
        {:else}
          <dl>
            {#each elenco as [nome, valore] (nome)}
              <dt>{nome}</dt>
              <dd>{valore}</dd>
            {/each}
          </dl>
        {/if}
      </Scheda>
    {/each}
    <p><a href={resolve('/profilo')}>Torna al profilo</a></p>
  {/if}
</PaginaAccount>

<style>
  p {
    margin: 0;
  }
  dl {
    margin: 0;
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
    gap: var(--spazio-1) var(--spazio-3);
    font-size: var(--testo-s);
  }
  dt {
    color: var(--colore-testo-attenuato);
    overflow-wrap: anywhere;
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
</style>
