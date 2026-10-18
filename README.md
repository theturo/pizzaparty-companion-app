# PizzaParty Companion App

L'app che accompagna il **PizzaParty**, la festa a base di pizze che si tiene due volte l'anno.
Sarà pubblicata su `app.pizza-party.net`.

> 🚧 In costruzione: prima edizione prevista per la primavera 2027.

## Cosa farà

- Countdown alla prossima edizione e check-in all'ingresso.
- Trofei da collezionare, edizione dopo edizione.
- Ordinazione delle pizze dal telefono, con coda in tempo reale in cucina.
- Pizzagram, il social fotografico della serata.

## Tecnologie

- **SvelteKit** (Svelte 5) in modalità statica, pubblicato su GitHub Pages, come PWA.
- **TypeScript.**
- **Firebase:** Authentication, Firestore, Storage, Cloud Functions, Cloud Messaging.
- Le autorizzazioni stanno nelle **regole di sicurezza** di Firebase, coperte da test automatici.
- La configurazione web di Firebase è pubblica per natura: non è un segreto.

## Sviluppo

Dopo ogni nuovo clone si attivano i controlli prima del commit:

```bash
brew install gitleaks
git config core.hooksPath .githooks
```

Il controllo prima del commit blocca due cose:

- un'email dell'autore che non sia quella _noreply_ di GitHub;
- segreti, indirizzi email o link a documenti privati nei file (regole in `.gitleaks.toml`).

Lo stesso controllo gira su GitHub a ogni push.

### Qualità del codice

```bash
npm run formatta   # formatta tutto (lo fa anche l'hook prima di ogni commit)
npm run lint       # formattazione + ESLint
npm test           # test unitari (Vitest)
npm run test:e2e   # test nel browser (Playwright)
npm run test:regole # regole di sicurezza di Firebase sugli emulatori (serve Java)
```

- I test nel browser simulano un telefono: Chromium in locale, Chromium e WebKit (Safari) su GitHub.
- Su macOS 13 Playwright non scarica i suoi browser, quindi in locale usa il Google Chrome installato.

### Sistema grafico e temi

- Le variabili e i temi delle edizioni sono in `web/src/lib/tema/`.
- La vetrina con tutti gli elementi e il selettore dei temi è su `/stile`.
- Ogni tema deve avere un fondo scuro e contrasti leggibili. Lo verifica:

```bash
npm run controlla-temi
```

Il controllo fa parte di `npm run check`, quindi gira anche su ogni PR.

### Icone dell'app

Le icone PNG si generano da `web/static/icons/icona.svg`:

```bash
npm run icone
```

### Emulatori Firebase

Lo sviluppo gira sugli emulatori, con un progetto `demo-pizzaparty`, senza toccare i dati reali:

```bash
npm run emulatori
```

L'interfaccia degli emulatori è su `http://localhost:4000`.
Serve Java 21: va bene una JDK di sistema oppure la [Temurin](https://adoptium.net/) estratta in `~/.jdks/`, che lo script trova da solo.

### Account (in sviluppo)

- Accesso con **link email per verificare, poi password**.
- In sviluppo (`npm run dev`) e nei test l'app usa **sempre gli emulatori**: per provare la registrazione avvia prima `npm run emulatori`. I link "mandati via email" si leggono nell'interfaccia degli emulatori, alla voce Authentication.
- **In produzione le pagine degli account restano nascoste** finché non sono pronti informativa, approvazione e cancellazione dei dati. Lo decide l'interruttore `ACCOUNT_ATTIVI` in `web/vite.config.ts`.

### Pubblicazione delle regole Firebase

- Le regole in `firebase/` si pubblicano da sole quando cambiano su `main`, dopo aver superato i test (workflow "Regole Firebase").
- GitHub accede a Google Cloud con **Workload Identity Federation**: nessuna chiave salvata.
- L'accesso si configura una volta sola con `scripts/cloud-shell/configura-pubblicazione-regole.sh`, lanciato in Google Cloud Shell.

**Flusso di lavoro:** si lavora su un branch e si apre una pull request. Su `main`, che è protetto e va in produzione, si unisce solo dopo la revisione.

## Licenza

- Il **codice** è distribuito con licenza [MIT](LICENSE).
- **Esclusi:** nome, grafiche, mascotte e testi del PizzaParty.
- I **font** mantengono la loro licenza (SIL Open Font License), inclusa accanto ai file.
