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

- **Installazione**: dal Profilo, "Installa l'app", e con un popup sul telefono quando si usa il browser: compare 1,5 secondi dopo l'apertura, sopra la pagina (sopra la barra in basso, oppure in alto nel login per non coprire il modulo); la × lo chiude solo per quella visita (a ogni apertura ricompare, finché l'app non è installata); mai su desktop né nell'app installata. Su Android apre il prompt di sistema, che Chrome offre solo in HTTPS; su iPhone e iPad (Safari, ma anche Chrome e gli altri browser iOS, che usano lo stesso motore) nessun sito può installare con un pulsante: mostra i passi da fare (Condividi → Aggiungi alla schermata Home; in Chrome iOS Condividi è in alto a destra).
- **Loader unico** (D-052): il cuore-pallina che rimbalza, `public/loader.svg` (animazione SVG, nessun JavaScript). Si usa ovunque si aspetta:
  - schermata di avvio, con il cuore a riposo nello stesso punto della schermata nativa;
  - caricamento delle pagine (`Loading`), solo dopo 250 ms;
  - pulsanti mentre l'azione è in corso (`ButtonLoader`), al posto di "Invio…" o "Salvataggio…".
  Niente altri spinner, scritte "Caricamento…" o shimmer.
- **Logo** (D-051): cuore-pallina da tennis, componente `Logo` in `src/components/ui.tsx`; `inverted` per gli sfondi scuri.
- **Icone**: generate da `public/icon.svg` con `pnpm exec pwa-assets-generator` (config `pwa-assets.config.ts`).
- **Schermata di avvio**: un unico elemento `#boot` in `index.html`, fuori da React, con il cuore che rimbalza come immagine (`public/loader.svg`, scaricata per prima con `preload`), che sfuma dentro in 0,7 secondi solo quando è caricata (`public/boot.js`, file separato perché la CSP non permette script nell'HTML). Non come SVG scritto nella pagina: lì l'animazione partirebbe solo a caricamento finito e il cuore resterebbe fermo. Quando la prima pagina è pronta sfuma e sparisce (`hideBoot` in `src/boot.ts`), ma resta almeno 1 secondo e sfuma solo quando il cuore tocca terra: in pratica circa 1,35 secondi, cioè due rimbalzi. Senza il minimo il cuore comparirebbe solo per un attimo. Una GIF come schermata nativa non è possibile: iOS mostra solo immagini ferme.
- **Schermate native di iPhone** (`public/splash`): iOS ammette solo immagini ferme, quindi sono **solo il colore di sfondo**; subito dopo il cuore compare con una breve dissolvenza e comincia a rimbalzare. Si rigenerano con `pnpm splash` (`scripts/splash.mjs`), solo se cambia il colore; dopo, alzare la versione `?v=` nei link di `index.html`, perché iPhone tiene in cache le immagini per indirizzo. iOS legge la schermata di avvio solo quando l'app viene aggiunta alla Home: chi l'ha già installata la vede cambiare solo togliendo e riaggiungendo l'app. Su Android la schermata nativa la costruisce il sistema con icona e colore del manifest.
- **Avvio senza scatti** (`src/boot.ts`): nessuna pagina, login compreso, compare prima dei font (attesa massima 1,5 secondi); nelle pagine dietro login la schermata di avvio aspetta anche login e dati del torneo, chiesti in parallelo. Poi sfuma sulla pagina già pronta. 
- **Cache**: il service worker (vite-plugin-pwa) tiene in cache solo i file dell'app (JS, CSS, HTML, icone). Le chiamate all'API vanno sempre al server: i dati non sono mai vecchi. Nginx serve `index.html` e `sw.js` senza cache, i file in `assets/` hanno un nome che cambia a ogni build.
- **Aggiornamenti** (`src/pwa.tsx`): controllo all'avvio, al ritorno in primo piano e ogni ora. Con l'app aperta compare "Nuova versione · Aggiorna"; se l'app va in background si aggiorna da sola.
- **Ritorno all'app**: se il telefono la tiene in memoria si torna esattamente dov'eri. Se il sistema la chiude in background:
  - si riapre l'ultima pagina vista, se è di meno di 12 ore fa;
  - i form tornano come li avevi lasciati (`src/drafts.ts`: risultato, contestazione, programmazione, email a cui è stato mandato il codice), per 24 ore o fino all'invio;
  - all'uscita ("Esci") bozze e ultima pagina si cancellano.
- **Login** (D-060): email e password dell'invito; in alternativa il codice di 6 cifre via email (D-049), che funziona anche nell'app installata su iPhone, dove un link aprirebbe Safari.
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
- **Sfondo del login** (telefono): foto di un campo in terra rossa dall'alto, `public/login-court.jpg` (1080×1920, 182 KB, senza metadati). Autore Maurits Bausenhart, [Unsplash](https://unsplash.com/photos/tennis-court-with-white-lines-XtcZbSPVJ3A), licenza Unsplash (uso libero). Su desktop si usa una foto orizzontale (vedi Desktop).
- **Classifica: tabella o schede** (D-057): tabella quando la classifica ha almeno 620 px (desktop, tablet, telefono in orizzontale), schede che si aprono sotto quella misura. Decide la larghezza disponibile (container query su `.st-board`), non il tipo di dispositivo. Nella tabella le sigle di colonna hanno un tooltip (passaggio del mouse o tocco, al posto della legenda) e le righe sono alternate per seguirle con l'occhio.
- **Desktop** (da 900 px, D-057), il telefono non cambia:
  - la barra in basso diventa una barra laterale scura con logo e sezioni;
  - contenuto largo fino a 1080 px: Home su due colonne (giornata ferma a sinistra, senza intestazione perché logo e nome sono nella barra laterale), Classifica con "Come si fanno i punti" a destra, Calendario con l'elenco delle giornate a sinistra e le partite della giornata scelta a destra (niente accordion: su più colonne lascerebbe buchi), Gallery con più foto per riga;
  - **pagine della partita in finestra** (scheda, foto, risultato, conferma): si aprono sopra la pagina di provenienza, che resta sotto con il suo scroll; senza provenienza (ricarica, link nelle email) sotto c'è la Home. L'indirizzo resta `/partite/…`. Si chiudono con la freccia indietro, un clic fuori o Esc (niente ×: copriva i pulsanti). Lo scorrimento è interno, così la barra non rovina gli angoli; mentre la finestra è aperta la pagina sotto non scorre e, se aveva la barra, ne viene riservato lo spazio (`lockPageScroll`), così niente si sposta. Sul telefono restano pagine intere (`useMatchModal` in `App.tsx`);
  - "Programma partita" diventa una finestra al centro;
  - login con foto a sinistra e modulo a destra: `public/login-court-desktop.jpg` (1920×1160, 186 KB, senza metadati), campo in terra rossa dall'alto con l'ombra di un giocatore, di Bernd Dittrich, [Unsplash](https://unsplash.com/photos/a-picture-of-a-tennis-court-with-a-shadow-of-a-tennis-player-_AYNT8tkRqI), licenza Unsplash. Si scarica solo su desktop.
- **Telefono in orizzontale e tablet** (600–899 px): colonna larga fino a 760 px.
- **Fogli e finestre** con altezza massima: il contenuto scorre, gli elementi non si schiacciano (prima il "Salva" di Programma partita era alto 17 px).
- **Aperture e chiusure animate** (D-053):
  - accordion (classifica, calendario, aiuto installazione) con `Collapse` e freccia `Chevron`;
  - fogli e finestre si chiudono con un'animazione (`useClosing`), non spariscono di colpo;
  - con "riduci movimento" attivo le animazioni degli accordion si spengono.
- Mobile first: l'uso tipico è a bordo campo (selfie, risultato).
- **Niente focus automatico** se non nasce da un tocco: su iPhone un focus dato dal codice (all'apertura, dopo una risposta del server, da una bozza ripristinata) non apre la tastiera e lascia il campo a metà, con l'etichetta alzata e senza tastiera.
- Inserimento del risultato con stepper grandi, validazione immediata e anteprima dei punti.
- Il gestionale è pensato per il desktop.
