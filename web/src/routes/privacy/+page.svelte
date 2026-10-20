<script lang="ts">
  // Informativa privacy (art. 13 GDPR, D-035). Se cambia, si alza VERSIONE_DOCUMENTI.
  import { resolve } from '$app/paths';
  import DocumentoLegale from '$lib/componenti/DocumentoLegale.svelte';
  import { TITOLARE, CONTATTO_PRIVACY } from '$lib/legale';
</script>

<DocumentoLegale titolo="Informativa privacy">
  <p>
    La PizzaParty Companion App è l'app che accompagna il PizzaParty, una festa privata tra amici.
  </p>
  <p>Qui trovi, senza giri di parole, quali dati usa, perché e cosa puoi farci tu.</p>

  <h2>Chi tratta i tuoi dati</h2>
  <p>
    Il titolare del trattamento è <strong>{TITOLARE}</strong>, organizzatore del PizzaParty, a
    titolo personale e senza scopo di lucro. Per qualsiasi domanda o richiesta sui tuoi dati scrivi
    a
    <a href="mailto:{CONTATTO_PRIVACY}">{CONTATTO_PRIVACY}</a>.
  </p>

  <h2>Quali dati usiamo</h2>
  <ul>
    <li>
      <strong>Account:</strong> la tua email e la password. La password è conservata in forma cifrata
      dal servizio di accesso di Google: nessuno può leggerla, nemmeno l'organizzatore. Registriamo anche
      quando hai creato l'account e quando hai fatto l'ultimo accesso.
    </li>
    <li>
      <strong>Profilo:</strong> il nome con cui ti conoscono al PizzaParty, l'avatar che scegli, chi ti
      ha invitato, lo stato della tua richiesta (in attesa o approvata) e il tuo codice d'invito.
    </li>
    <li>
      <strong>Conferme:</strong> la dichiarazione di avere almeno 18 anni e la presa visione di questa
      informativa e delle condizioni d'uso, con la loro versione e la data.
    </li>
    <li>
      <strong>Sul tuo dispositivo:</strong> l'app salva la sessione e una copia delle pagine per funzionare
      anche con poca rete. Non usiamo cookie di profilazione, statistiche o pubblicità.
    </li>
  </ul>
  <p>
    Non raccogliamo posizione, dati di pagamento né dati sulla salute. Quando arriveranno nuove
    funzioni (trofei, presenze, ordini delle pizze, foto), questa informativa verrà aggiornata e te
    lo diremo nell'app.
  </p>

  <h2>Perché li usiamo</h2>
  <ul>
    <li>
      Per farti entrare nell'app, approvare la tua richiesta e farti invitare altre persone: è il
      servizio che chiedi registrandoti (art. 6.1.b GDPR).
    </li>
    <li>
      Per tenere l'app sicura ed evitare abusi, per esempio account falsi o inviti girati a
      sconosciuti (legittimo interesse, art. 6.1.f GDPR).
    </li>
    <li>Per rispondere alle tue richieste.</li>
  </ul>

  <h2>Chi vede cosa</h2>
  <ul>
    <li>
      <strong>L'organizzatore</strong> vede il tuo profilo e, finché la richiesta è in attesa, la tua
      email, per decidere se approvarla.
    </li>
    <li>
      <strong>Gli altri account approvati</strong> vedono solo il tuo nome e il tuo avatar. Chi è ancora
      in attesa non vede nessuno.
    </li>
    <li>I dati non vengono venduti, ceduti o usati per altri scopi.</li>
  </ul>

  <h2>Fornitori e dove vengono archiviati i dati</h2>
  <p>
    Per funzionare, l'app si appoggia ad alcuni servizi esterni che trattano i dati per nostro
    conto:
  </p>
  <ul>
    <li>
      <strong>Google (Firebase)</strong>: accesso, database e funzioni sul server. Il database e le
      funzioni si trovano a <strong>Milano</strong>. Il servizio di accesso è gestito da Google
      anche fuori dall'Unione europea.
    </li>
    <li>
      <strong>GitHub</strong>: pubblica le pagine dell'app e, come ogni sito, può registrare nei
      suoi log tecnici l'indirizzo IP di chi le visita.
    </li>
    <li>
      <strong>Mailgun</strong>, tramite Squarespace: inoltra all'organizzatore le email scritte a
      {CONTATTO_PRIVACY}.
    </li>
  </ul>
  <p>
    Google, GitHub e Mailgun hanno sede negli <strong>Stati Uniti</strong>: il trasferimento dei
    dati avviene sulla base dell'EU-US Data Privacy Framework e delle clausole contrattuali standard
    della Commissione europea.
  </p>

  <h2>Per quanto tempo</h2>
  <ul>
    <li>L'account e il profilo restano finché non elimini l'account.</li>
    <li>Se non usi l'app per <strong>3 anni</strong>, l'account si cancella da solo.</li>
    <li>Una richiesta mai approvata si cancella dopo <strong>60 giorni</strong>.</li>
    <li>Una richiesta rifiutata si cancella <strong>subito</strong>, insieme all'account.</li>
    <li>Le email inviate a {CONTATTO_PRIVACY} si conservano il tempo necessario a gestirle.</li>
  </ul>

  <h2>I tuoi diritti</h2>
  <p>In ogni momento puoi:</p>
  <ul>
    <li>
      <strong>vedere e scaricare</strong> i tuoi dati dal profilo, in
      <a href={resolve('/profilo/dati')}>I tuoi dati</a> (accesso e portabilità);
    </li>
    <li><strong>correggere</strong> nome e avatar dal profilo (rettifica);</li>
    <li>
      <strong>eliminare l'account</strong> e tutti i dati collegati dal profilo, in
      <a href={resolve('/profilo/elimina')}>Elimina l'account</a> (cancellazione);
    </li>
    <li>
      chiedere la limitazione o opporti al trattamento, scrivendo a
      <a href="mailto:{CONTATTO_PRIVACY}">{CONTATTO_PRIVACY}</a>.
    </li>
  </ul>
  <p>
    Se ritieni che i tuoi dati siano trattati in modo non corretto, puoi presentare reclamo al
    <a href="https://www.garanteprivacy.it" rel="external noopener"
      >Garante per la protezione dei dati personali</a
    >.
  </p>

  <h2>Maggiore età</h2>
  <p>L'app è riservata a chi ha almeno 18 anni.</p>

  <h2>Modifiche</h2>
  <p>
    Se questa informativa cambia, la nuova versione sarà indicata in alto e te lo segnaleremo
    nell'app.
  </p>
</DocumentoLegale>
