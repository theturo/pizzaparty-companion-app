# PizzaParty Companion App

L'app che accompagna il **PizzaParty**, una festa privata a base di pizze che si tiene due volte l'anno.
È una web app installabile sul telefono (PWA), pubblicata su `app.pizza-party.net`.

> 🚧 In costruzione: la prima edizione con l'app è prevista per la primavera 2027.

## Come funziona

L'app è riservata agli invitati. Chiunque può registrarsi, ma entra davvero solo dopo l'approvazione di un organizzatore.

1. **Registrazione:** si conferma l'email con un link, poi si sceglie una password, un nome e un avatar.
2. **Richiesta in attesa:** finché non viene approvata, l'account non vede nessun altro iscritto.
3. **Approvazione:** un admin approva o rifiuta la richiesta. Se la rifiuta, i dati della richiesta vengono cancellati.
4. **Inviti:** ogni account approvato ha un link d'invito personale da condividere con gli amici.

### Cosa si può fare oggi

- Registrarsi, accedere e recuperare la password.
- Modificare nome, avatar e password dal profilo.
- Ricevere notifiche push, se si attivano.
- Invitare altre persone con il proprio link.
- Scaricare tutti i propri dati o eliminare l'account in autonomia.
- Segnalare un problema con una mail già pronta.
- Per gli admin: approvare o rifiutare le richieste.

### In arrivo

- Le edizioni, con countdown e informazioni sull'evento per gli invitati approvati.
- Check-in all'ingresso e trofei da collezionare, edizione dopo edizione.
- Ordinazione delle pizze dal telefono, con la coda in tempo reale in cucina.
- Pizzagram, il social fotografico della serata.

## Dati trattati

L'app raccoglie solo quello che serve per farla funzionare. L'informativa completa è nell'app, alla pagina `/privacy`.

| Dato                                                                         | Perché                                           | Chi lo vede                                                                                                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Email e password                                                             | Accesso                                          | L'email solo gli admin, e solo finché la richiesta è in attesa. La password non la vede nessuno: è gestita in forma cifrata da Firebase Authentication |
| Nome, avatar, chi ti ha invitato, stato della richiesta, codice d'invito     | Profilo e approvazione                           | Nome e avatar gli altri account approvati, il resto solo gli admin                                                                                     |
| Maggiore età, accettazione di informativa e condizioni (con versione e data) | Requisiti per usare l'app                        | Solo gli admin                                                                                                                                         |
| Codice del dispositivo per le notifiche, se attivate                         | Mandare le notifiche push                        | Nessuno, lo usa solo il sistema                                                                                                                        |
| Date di creazione dell'account e dell'ultimo accesso                         | Sicurezza e cancellazione degli account inattivi | Solo gli admin                                                                                                                                         |

**Cosa non raccoglie:** posizione, dati di pagamento, dati sulla salute. Niente cookie di profilazione, statistiche o pubblicità.

**Conservazione:**

- Le richieste mai approvate si cancellano da sole dopo 60 giorni.
- Gli account inattivi da 3 anni si cancellano da soli.
- Eliminando l'account si cancellano subito tutti i dati collegati.

**Dove stanno i dati:** su Firebase (Google), con database e Cloud Functions nella regione di Milano (`europe-west8`). L'app è ospitata su GitHub Pages.

Quando arriveranno nuove funzioni (presenze, trofei, ordini, foto), questa tabella e l'informativa verranno aggiornate.

## Sicurezza

- **Permessi nelle regole di Firebase:** chi può leggere o scrivere cosa è deciso dalle regole di sicurezza, coperte da test automatici. Le operazioni delicate (approvazioni, inviti, export, cancellazione) passano dalle Cloud Functions.
- **Nessun segreto nella repo:** un controllo automatico blocca chiavi, segreti e indirizzi email, prima di ogni commit e a ogni push.
- **Pubblicazione senza chiavi:** GitHub accede a Google Cloud con Workload Identity Federation, senza credenziali salvate.
- **Configurazione di Firebase:** la configurazione web è pubblica per natura e non è un segreto: la protezione la danno le regole.

## Tecnologie

- **SvelteKit** (Svelte 5) e **TypeScript**, in modalità statica, come PWA.
- **Firebase:** Authentication, Firestore, Cloud Functions, Cloud Messaging.
- **Test:** Vitest (unitari), Playwright (nel browser, Chromium e WebKit), emulatori di Firebase (regole di sicurezza).

## Struttura

```
web/        l'app (SvelteKit)
functions/  Cloud Functions (TypeScript, Node 22)
firebase/   regole di sicurezza di Firestore e Storage
tests/      test delle regole di sicurezza
scripts/    script di supporto e di configurazione
```

## Sviluppo

Requisiti: Node 24 e Java 21 (per gli emulatori di Firebase).

```bash
npm install
npm run emulatori   # emulatori di Firebase, interfaccia su http://localhost:4000
npm run dev         # l'app in sviluppo, collegata sempre agli emulatori
```

In sviluppo l'app non tocca mai i dati reali: usa un progetto dimostrativo sugli emulatori. I link di verifica "mandati via email" si leggono nell'interfaccia degli emulatori, alla voce Authentication.

```bash
npm run lint         # formattazione + ESLint
npm run check        # controllo dei tipi e dei temi
npm test             # test unitari
npm run test:e2e     # test nel browser
npm run test:regole  # test delle regole di sicurezza
```

## Licenza

- Il **codice** è distribuito con licenza [MIT](LICENSE).
- **Esclusi:** nome, grafiche, mascotte e testi del PizzaParty.
- I **font** mantengono la loro licenza (SIL Open Font License), inclusa accanto ai file.
