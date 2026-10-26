# Tecnologia — Frontend

> Stato: in uso. Riferimento grafico: `design/mockup/`.

## Stack

| Area | Scelta |
|---|---|
| Linguaggio | TypeScript strict |
| UI | React 18 + Vite |
| Routing | React Router 7 |
| Dati | TanStack Query: una chiamata scarica la stagione intera (D-033), le azioni invalidano la cache |
| Form | logica condivisa in `apps/web/src/score-form.ts`, validazione col motore di `packages/shared` |
| Stile | CSS semplice con token (variabili CSS) presi dal mockup, `apps/web/src/styles.css`, tema chiaro e scuro (D-032) |
| Foto | ridotte e ricodificate in JPEG sul telefono (`photos.ts`), poi caricate all'API (D-038) |
| Lingua | solo italiano |

Monorepo pnpm: `apps/web`, `apps/api`, `packages/shared` (motore di punteggio e classifica, usato sia dal web per l'anteprima sia dall'API come fonte di verità).

## Struttura

- **App** (telefono) e **gestionale** (desktop, `/admin`) nella stessa app, senza link tra loro (D-022, D-036).
- Tutto dietro login (D-009); libera solo `/login`.
- Rotte dell'app: `/`, `/classifica`, `/calendario`, `/gallery`, `/profilo`, `/giocatori/:id`, `/partite/:id` (+ `/risultato`, `/conferma`, `/foto`).
- Stati delle partite derivati, mai salvati (D-029): Da programmare, Programmata, Rinviata, Da recuperare, Provvisoria, Confermata, Contestata.

## App installabile (D-048)

- **Installazione**: dal Profilo, "Installa l'app". Su Android apre il prompt di sistema; su iPhone si fa da Safari (Condividi → Aggiungi alla schermata Home).
- **Loader unico** (D-052): il cuore-pallina che rimbalza, `public/loader.svg` (animazione SVG, nessun JavaScript). Si usa ovunque si aspetta:
  - schermata di avvio, con il cuore a riposo nello stesso punto della schermata nativa;
  - caricamento delle pagine (`Loading`), solo dopo 250 ms;
  - pulsanti mentre l'azione è in corso (`ButtonLoader`), al posto di "Invio…" o "Salvataggio…".
  Niente altri spinner, scritte "Caricamento…" o shimmer.
- **Logo** (D-051): cuore-pallina da tennis, componente `Logo` in `src/components/ui.tsx`; `inverted` per gli sfondi scuri.
- **Icone e schermate di avvio**: generate da `public/icon.svg` con `pnpm exec pwa-assets-generator` (config `pwa-assets.config.ts`). I link delle schermate iPhone vanno copiati in `index.html` dopo ogni rigenerazione. In `index.html` c'è anche una schermata di avvio HTML, uguale a quella nativa, che resta finché l'app non è pronta.
- **Avvio senza scatti** (`src/boot.ts`): nessuna pagina, login compreso, compare prima dei font (attesa massima 1,5 secondi); nelle pagine dietro login la schermata di avvio aspetta anche login e dati del torneo, chiesti in parallelo. Poi sfuma sulla pagina già pronta. 
- **Cache**: il service worker (vite-plugin-pwa) tiene in cache solo i file dell'app (JS, CSS, HTML, icone). Le chiamate all'API vanno sempre al server: i dati non sono mai vecchi. Nginx serve `index.html` e `sw.js` senza cache, i file in `assets/` hanno un nome che cambia a ogni build.
- **Aggiornamenti** (`src/pwa.tsx`): controllo all'avvio, al ritorno in primo piano e ogni ora. Con l'app aperta compare "Nuova versione · Aggiorna"; se l'app va in background si aggiorna da sola.
- **Ritorno all'app**: se il telefono la tiene in memoria si torna esattamente dov'eri. Se il sistema la chiude in background:
  - si riapre l'ultima pagina vista, se è di meno di 12 ore fa;
  - i form tornano come li avevi lasciati (`src/drafts.ts`: risultato, contestazione, programmazione, email a cui è stato mandato il codice), per 24 ore o fino all'invio;
  - all'uscita ("Esci") bozze e ultima pagina si cancellano.
- **Login con codice** (D-049): su iPhone l'app installata non condivide il login con Safari, quindi un link nell'email non servirebbe. Si entra solo con il codice di 6 cifre, scritto nell'app.
- **In sviluppo** il service worker è spento e un indirizzo `http://IP` non è sicuro per il browser: dal telefono si provano aggiunta alla Home (solo iPhone), schermata di avvio, login e ripresa della pagina, ma cache e aggiornamenti si vedono solo in HTTPS, cioè in produzione.

## Testi: minimalismo (D-045)

L'app è ovvia per chi la usa: i testi devono essere pochi e brevi.
- **Niente spiegazioni di cose evidenti**: niente sottotitoli che descrivono la pagina, niente "tocca qui per…", niente frasi su cosa succederà dopo un'azione.
- **Niente ripetizioni**: se un'etichetta di stato dice già "Rinviata", non serve anche una nota.
- **Pulsanti e conferme corti**: "Salva", "Risultato inviato", "Partita programmata".
- **Niente dettagli tecnici o di regolamento** dove non servono (durata del codice, giorni di sessione, formula dei punti).
- **Si scrive solo quello che serve per agire o non sbagliare**: un errore, uno stato, un avviso che cambia cosa fa l'utente (es. torneo ancora in corso, attesa di conferma).
- **Eccezione**: in Classifica resta "Come si fanno i punti", perché il punteggio non è ovvio.
- Nel dubbio, si toglie.

## Linee guida UX
- **Classifica solo a schede** (D-053): ogni giocatore si apre per vedere le statistiche. Niente vista a tabella.
- **Aperture e chiusure animate** (D-053):
  - accordion (classifica, calendario, aiuto installazione) con `Collapse` e freccia `Chevron`;
  - fogli e finestre si chiudono con un'animazione (`useClosing`), non spariscono di colpo;
  - con "riduci movimento" attivo le animazioni degli accordion si spengono.
- Mobile first: l'uso tipico è a bordo campo (selfie, risultato).
- **Niente focus automatico** se non nasce da un tocco: su iPhone un focus dato dal codice (all'apertura, dopo una risposta del server, da una bozza ripristinata) non apre la tastiera e lascia il campo a metà, con l'etichetta alzata e senza tastiera.
- Inserimento del risultato con stepper grandi, validazione immediata e anteprima dei punti.
- Il gestionale è pensato per il desktop.
