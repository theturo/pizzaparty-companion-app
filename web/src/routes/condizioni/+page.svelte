<script lang="ts">
  // Condizioni d'uso (D-013, D-035). Se cambiano, si alza VERSIONE_DOCUMENTI.
  import { resolve } from '$app/paths';
  import DocumentoLegale from '$lib/componenti/DocumentoLegale.svelte';
  import { TITOLARE, CONTATTO_PRIVACY } from '$lib/legale';
</script>

<DocumentoLegale titolo="Condizioni d'uso">
  <h2>Cos'è l'app</h2>
  <p>
    La PizzaParty Companion App è un'app gratuita, privata e senza scopo di lucro per chi partecipa
    al PizzaParty, organizzato da <strong>{TITOLARE}</strong>. Serve a seguire le edizioni, entrare
    alla festa, collezionare trofei, ordinare le pizze e condividere le foto della serata.
  </p>

  <h2>Chi può usarla</h2>
  <ul>
    <li>Chi ha almeno <strong>18 anni</strong>.</li>
    <li>Con un account personale: non condividerlo e tieni la password per te.</li>
    <li>
      Ogni nuovo account viene approvato dall'organizzatore, che può accettare o meno una richiesta
      senza doverne spiegare il motivo.
    </li>
  </ul>

  <h2>Come comportarsi</h2>
  <ul>
    <li>Rispetto per tutti: niente contenuti offensivi, discriminatori o illegali.</li>
    <li>
      Gira il tuo link d'invito solo a persone che conosci e che verrebbero volentieri alla festa.
    </li>
    <li>Non cercare di aggirare i controlli dell'app o di accedere ai dati degli altri.</li>
  </ul>
  <p>In caso di abusi, l'organizzatore può sospendere o eliminare un account.</p>

  <h2>L'app così com'è</h2>
  <p>
    L'app è un progetto amatoriale, offerto così com'è: può avere dei problemi, cambiare, essere
    sospesa o chiusa. Usarla non costa nulla; la quota della festa è un'altra cosa e si gestisce a
    parte.
  </p>

  <h2>I tuoi dati</h2>
  <p>
    Come usiamo i tuoi dati è spiegato nell'<a href={resolve('/privacy')}>informativa privacy</a>.
    Puoi eliminare l'account quando vuoi dal profilo.
  </p>

  <h2>Contatti e modifiche</h2>
  <p>
    Per qualsiasi domanda scrivi a <a href="mailto:{CONTATTO_PRIVACY}">{CONTATTO_PRIVACY}</a>. Se
    queste condizioni cambiano, la nuova versione sarà indicata in alto e te lo segnaleremo
    nell'app.
  </p>
</DocumentoLegale>
