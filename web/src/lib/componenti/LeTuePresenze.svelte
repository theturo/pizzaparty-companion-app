<script lang="ts">
  // Profilo: le proprie presenze alle feste (D-072). Si legge una volta: la query del collection
  // group filtra sul proprio uid (regole: presenze, connesso() e uid uguale al proprio).
  import Scheda from '$lib/componenti/Scheda.svelte';
  import { sessione } from '$lib/account/sessione.svelte';
  import { presenzeDellaPersona, type EdizioneStatistica } from '$lib/edizioni/statistiche';

  let elenco = $state<{ id: string; nome: string; data: string }[] | null>(null);
  let errore = $state('');

  $effect(() => {
    const uid = sessione.utente?.uid;
    if (!uid) return;
    let annullato = false;
    (async () => {
      try {
        const [{ firebase }, f] = await Promise.all([
          import('$lib/firebase/app'),
          import('firebase/firestore'),
        ]);
        const db = firebase().db;
        const presenze = await f.getDocs(
          f.query(f.collectionGroup(db, 'presenze'), f.where('uid', '==', uid)),
        );
        const idEdizioni = [...new Set(presenze.docs.map((p) => p.ref.parent.parent?.id ?? ''))];
        // Le edizioni si leggono una a una: le regole le aprono solo a chi è approvato, e per le bozze no.
        const edizioni = await Promise.all(
          idEdizioni.map((id) => f.getDoc(f.doc(db, 'edizioni', id))),
        );
        const letture: EdizioneStatistica[] = edizioni
          .filter((e) => e.exists())
          .map((e) => {
            const quando = e.get('quando') as { tipo?: string; data?: string } | undefined;
            return {
              id: e.id,
              nome: (e.get('nome') as string | undefined) ?? '',
              data: quando?.tipo === 'data' ? (quando.data ?? null) : null,
            };
          });
        if (annullato) return;
        elenco = presenzeDellaPersona(
          presenze.docs.map((p) => ({ edizione: p.ref.parent.parent?.id ?? '' })),
          letture,
        );
      } catch {
        if (!annullato) errore = 'Non sono riuscito a leggere le tue presenze. Riprova tra poco.';
      }
    })();
    return () => {
      annullato = true;
    };
  });
</script>

<Scheda>
  <h2 class="titolo">Le tue presenze</h2>
  {#if errore}
    <p class="errore" role="alert">{errore}</p>
  {:else if elenco === null}
    <p class="attenuato" role="status">Carico le tue presenze…</p>
  {:else if elenco.length === 0}
    <p class="attenuato">Non hai ancora presenze registrate.</p>
  {:else}
    <p class="numero">
      {elenco.length === 1
        ? 'Hai partecipato a 1 PizzaParty.'
        : `Hai partecipato a ${elenco.length} PizzaParty.`}
    </p>
    <ul class="elenco">
      {#each elenco as edizione (edizione.id)}
        <li>{edizione.nome} · {edizione.data.slice(0, 4)}</li>
      {/each}
    </ul>
  {/if}
</Scheda>

<style>
  .titolo {
    font-size: var(--testo-l);
  }
  p {
    margin: 0;
  }
  .numero {
    font-weight: 700;
  }
  .elenco {
    margin: 0;
    padding-left: var(--spazio-5);
    display: grid;
    gap: var(--spazio-1);
  }
  .errore {
    font-size: var(--testo-s);
    font-weight: 700;
    color: var(--colore-secondario);
  }
</style>
