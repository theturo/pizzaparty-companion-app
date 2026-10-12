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
- un'email dell'autore che non sia quella *noreply* di GitHub;
- segreti, indirizzi email o link a documenti privati nei file (regole in `.gitleaks.toml`).

Lo stesso controllo gira su GitHub a ogni push.

**Flusso di lavoro:** si lavora su un branch e si apre una pull request. Su `main`, che è protetto e va in produzione, si unisce solo dopo la revisione.

## Licenza
- Il **codice** è distribuito con licenza [MIT](LICENSE).
- **Esclusi:** nome, grafiche, mascotte e testi del PizzaParty.
- I **font** mantengono la loro licenza (SIL Open Font License), inclusa accanto ai file.
