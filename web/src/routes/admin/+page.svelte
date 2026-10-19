<script lang="ts">
  // Pannello admin: richieste di account da approvare (D-009, D-033). Visibile solo agli admin;
  // la vera protezione sono le regole (richieste/ leggibili solo con il permesso "admin").
  import { resolve } from '$app/paths';
  import PaginaAccount from '$lib/componenti/PaginaAccount.svelte';
  import SchedaRichiesta, { type Richiesta } from '$lib/componenti/SchedaRichiesta.svelte';
  import { sessione } from '$lib/account/sessione.svelte';

  let richieste = $state<Richiesta[] | null>(null);

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
      const elenco = query(collection(firebase().db, 'richieste'), orderBy('creato', 'asc'));
      smetti = onSnapshot(elenco, (istantanea) => {
        richieste = istantanea.docs.map((d) => {
          const dati = d.data();
          return {
            uid: d.id,
            email: dati.email ?? null,
            nome: dati.nome,
            avatar: dati.avatar,
            invitatoDa: dati.invitatoDa,
            creato: dati.creato?.toDate?.() ?? null,
          };
        });
      });
    })();
    return () => {
      annullato = true;
      smetti?.();
    };
  });
</script>

<PaginaAccount titolo="Richieste" etichetta="Pannello admin">
  {#if sessione.stato === 'caricamento'}
    <p class="attenuato" role="status">Un momento…</p>
  {:else if !sessione.permessi.admin}
    <p class="attenuato">Questa pagina è riservata agli admin.</p>
    <p><a href={resolve('/profilo')}>Torna al profilo</a></p>
  {:else if richieste === null}
    <p class="attenuato" role="status">Carico le richieste…</p>
  {:else if richieste.length === 0}
    <p class="attenuato">Nessuna richiesta in attesa. Il forno è tranquillo.</p>
  {:else}
    <p class="attenuato">
      {richieste.length === 1 ? '1 richiesta' : `${richieste.length} richieste`} in attesa.
    </p>
    {#each richieste as richiesta (richiesta.uid)}
      <SchedaRichiesta {richiesta} />
    {/each}
  {/if}
</PaginaAccount>
