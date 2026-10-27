# Prodotto — visione generale

> Documento vivo: si costruisce man mano. Le parti **[DA DECIDERE]** sono proposte non ancora confermate.

## 1. Contesto

**TennIsLove** (D-050) è la web app di **ATP Umbria Tournament**, un torneo amatoriale di tennis tra amici ("Amici Tennis · Pre-cena"), stagione 2026/27, partito il 12 ottobre 2026.
Oggi è gestito con un PDF (regolamento + calendario) e un foglio Excel che calcola punti e classifica. L'organizzatore e committente è **Giuseppe De Francesca**, anche lui giocatore.

Problemi di oggi:
- i risultati li inserisce a mano una persona nell'Excel;
- giocatori e amici non vedono la classifica in tempo reale;
- nessuno sa quando e dove si giocano le partite degli altri;
- non c'è un ricordo condiviso del torneo (foto, storico).

## 2. Obiettivo

Una web app, comoda soprattutto da telefono, che sostituisca PDF ed Excel:
1. applica **da sola** il regolamento: classifica e statistiche si aggiornano appena viene inserito un risultato;
2. permette ai giocatori di **organizzarsi**: fissare data, ora e circolo della propria partita e vedere quelle degli altri;
3. costruisce la **memoria del torneo**: un selfie per partita, che diventa la copertina della partita e finisce in una gallery.

## 3. Composizione del prodotto

### 3.1 Sito (lato giocatori)
L'app è **privata** (D-009): tutte le pagine richiedono il login. Il "sito pubblico" è quindi l'area comune che ogni giocatore loggato vede:
- **Home**: giornata in corso, prossime partite in programma (data/ora/circolo), ultimi risultati, top della classifica.
- **Classifica**: completa, con tutte le colonne del foglio Excel (posizione, punti, giocate, vinte, perse, senza esito, game fatti/subiti/differenza, bonus e compensazioni; zona Top 8 solo se il torneo ha una fase finale, D-041).
- **Calendario**: tutte le giornate con stato di ogni partita (da programmare / programmata / giocata / da verificare).
- **Scheda partita**: giocatori, settimana prevista (ed eventuale rinvio), data/ora/circolo se fissati, punteggio con l'indicazione **provvisorio/confermato**, punti assegnati, selfie di copertina (oppure immagine di default).
- **Scheda giocatore**: foto, statistiche, partite giocate e da giocare, scontri diretti.
- **Gallery**: tutte le foto delle partite, ognuna collegata alla sua partita.

Area personale del giocatore, dopo il login:
- **Le mie partite**: prossime partite e settimana in cui vanno giocate, partite giocate.
- **Programma partita**: inserisce data, ora e circolo (dalla lista, oppure un campo non in lista scritto a mano, D-040). La partita compare in calendario; entrambi ricevono un'email con il link "aggiungi al calendario" (.ics / Google Calendar) e un promemoria prima della partita (D-013).
- **Rinvia partita**: se la partita non si gioca nella sua settimana, viene segnata come rinviata e si può programmare più avanti (D-012).
- **Carica selfie** (facoltativo ma incoraggiato, D-011): a inizio partita uno dei due carica la foto della coppia. Senza foto la copertina è l'immagine di default (logo dell'app).
- **Inserisci risultato**: a fine partita uno dei due inserisce il punteggio (set 1, set 2, eventuale super tie break, oppure "tempo scaduto"). Il risultato è **provvisorio** finché l'avversario non lo conferma; dopo 2 giorni senza risposta si conferma da solo (D-010, D-016).
- **Conferma/contesta risultato**: l'avversario riceve un'email e conferma o contesta.
- **Profilo**: foto, eventualmente nome visualizzato.

### 3.2 Gestionale (admin)
Per l'organizzatore (Giuseppe e chi gestisce l'app):
- **Torneo/stagione**: crea il torneo, imposta le date, le pause e la fase (girone, fase finale).
- **Giocatori**: anagrafica (nome, cognome, nome breve, email, foto), invito via email.
- **Circoli**: lista dei circoli in cui si gioca (nome, indirizzo, link mappa).
- **Calendario**: importa/genera le giornate, sposta una partita da una settimana all'altra.
- **Import Excel** (D-026): carica un file nello stesso formato dell'Excel del cliente (`ATP_Umbria_calendario_classifica_OK.xlsm`, foglio `Calendario`, ID partita `Gnn-mm`) per aggiornare risultati e calendario in blocco, con anteprima delle differenze prima di applicare.
- **Risultati**: correzione o annullamento di qualsiasi risultato, risoluzione delle contestazioni, conferma forzata.
- **Rinvii**: li gestiscono i giocatori (D-018); l'admin vede solo l'elenco delle partite rinviate o da recuperare.
- **Moderazione gallery**: rimozione delle foto.
- **Fase finale** (rimandata, D-041): sceglie lo schema degli incroci (ipotesi A o B), genera il tabellone e ne gestisce i risultati.
- **Regole di punteggio**: versionate (il regolamento è già cambiato una volta il 21/10/2026 e la nuova regola vale anche per le partite già giocate → serve ricalcolare tutto).

## 4. Utenti e ruoli

| Ruolo | Chi | Può |
|---|---|---|
| Giocatore | i 12 iscritti | vedere tutto (classifica, calendario, partite di tutti, gallery); programmare, rinviare, caricare selfie, inserire e confermare risultati **solo per le proprie partite** |
| Admin | Giuseppe + team | tutto, compreso il gestionale |

Admin: Giuseppe e Alessandro, con account `@kalei.do` creati dallo sviluppatore (D-025). Un admin può essere anche giocatore. Niente visitatori anonimi né account spettatore (D-009, D-019).

## 5. Regolamento

Tutte le regole del torneo, con la fonte di ciascuna, sono in `06-regolamento.md`. Vale la regola d'oro scritta lì: se una regola non c'è, non si implementa.

## 6. Requisiti dal committente (21–22/10/2026, testuali in sintesi)

1. Vedere le proprie partite, i prossimi incontri e le date (si gioca entro la settimana, la coppia si accorda da sola).
2. Classifica completa con tutti i dati e le statistiche.
3. Segnare la propria partita (quando, dove, ora) così che diventi un promemoria.
4. Vedere quando e dove si giocano le partite degli altri.
5. A fine gara uno dei due inserisce il punteggio, la classifica si aggiorna da sola.
6. A inizio partita la coppia carica un selfie: va nella gallery e diventa la copertina della partita.
7. Lista dei circoli pre-inserita (fornita il 26/10, più l'opzione di un campo non in lista).
8. Lista giocatori con nome, cognome e mail (fornita, manca una mail); foto "segnaletica" inviata dai giocatori o presa dai social.

## 7. MVP
Il progetto è gratuito e senza scadenza (D-015), quindi si rilascia a piccoli pezzi:
1. **MVP**: login con codice via email (D-049), classifica, calendario, le mie partite, inserimento risultato con conferma/conferma automatica, admin minimo (correggere risultati). Seed con i dati attuali.
2. Programmazione partita + email con link calendario + promemoria.
3. Selfie e gallery.
4. Rinvii.
5. Fase finale (rimandata, D-041).

## 7.1 Fuori scope (per ora)
- Prenotazione dei campi presso i circoli.
- Pagamenti/quote.
- Chat tra giocatori (si organizzano già su WhatsApp).
- App native: TennIsLove è una web app installabile (PWA, D-048).
- Notifiche push (v1 solo email, D-013).

## 8. Idee da valutare (non richieste)
- Email a metà settimana alle coppie che non hanno ancora programmato.
- Link "condividi su WhatsApp" per risultato e classifica.
- Statistiche avanzate: striscia di vittorie, andamento della posizione per giornata, % di partite al super tie break.

## 9. Pronostici (D-061)

Gioco a parte tra i giocatori: si pronostica l'esito delle partite degli altri. **I punti dei pronostici sono una classifica separata e non toccano in alcun modo i punti del torneo.**

- **Chi**: tutti i giocatori della stagione, tranne i due della partita.
- **Cosa**: il **vincitore** (obbligatorio) e, facoltativo, il **modo**: in 2 set o al super tie break.
- **Punti**:

  | | Punti |
  |---|---|
  | Vincitore giusto | 2 |
  | Modo giusto (solo se anche il vincitore è giusto) | +1 |
  | **Colpo grosso**: vincitore giusto scelto da non più di 1 votante su 4 | +2 |

- **Chiusura**: all'ora programmata della partita; se non è programmata, quando viene inserito il risultato. Fino alla chiusura il pronostico si può cambiare; una partita rinviata prima dell'inizio resta aperta.
- **Visibilità**: prima di votare solo il numero di pronostici; dopo aver votato le percentuali; a pronostici chiusi anche i nomi, visibili a tutti compresi i due giocatori.
- **Annullati** (non contano per nessuno): tempo scaduto senza vincitore, partita mai giocata.
- **Risultati**: i provvisori danno punti subito, come in classifica (D-017); i contestati restano fuori finché l'admin non decide.
- **Calcolo**: i punti si ricalcolano sempre dai risultati, mai salvati (come D-006). Si salva solo il pronostico: partita, giocatore, vincitore, modo, data; uno per giocatore e partita.
- **Dove**: una pagina **Pronostici** (`/pronostici`) con le partite da pronosticare per giornata (le righe non si spostano votando; conferma "Salvato"), i propri pronostici chiusi con l'esito e i punti, e il link alla classifica. In Home solo un riassunto (quanti da fare, posizione) che porta alla pagina; la pagina è anche tra le sezioni (barra in basso sul telefono, scorrevole in orizzontale; barra laterale su desktop). Nella scheda partita la sezione pronostici; in Classifica una scheda "Pronostici" (punti, indovinati su giocati, colpi grossi). A fine stagione il primo è **l'Oracolo**.

## 10. Badge e card del giocatore (D-062)

Riconoscimenti calcolati dai dati che l'app ha già (risultati, date, foto, pronostici): **nessun dato salvato**, si ricalcolano come la classifica. Contano i risultati provvisori e confermati, non i contestati (come D-017). Ogni badge ha un suo logo.

| Badge | Si ottiene |
|---|---|
| Prima vittoria | la prima partita vinta della stagione |
| Cappotto | un set vinto 6-0 |
| Rimonta | una partita vinta dopo aver perso il primo set |
| Muro | una vittoria concedendo al massimo 3 game in tutta la partita |
| Tris | 3 vittorie di fila (una partita senza vincitore interrompe la serie) |
| Re del tie break | 3 partite vinte al super tie break |
| Ammazzagrandi | battuto chi in quel momento era primo in classifica (anche a pari merito), con almeno una partita giocata |
| Fotografo | foto in 3 delle proprie partite |
| Indovino | 5 pronostici con il vincitore giusto |
| Colpo grosso | un colpo grosso nei pronostici (§9) |
| Campione | vincitore del torneo, indicato dall'admin |
| Oracolo | primo nella classifica dei pronostici a stagione chiusa |
| Podio | tra i primi 3 a stagione chiusa |

- **Ordine delle partite** (Tris, Ammazzagrandi): per giorno giocato: la data programmata, altrimenti quella di inserimento del risultato ma non oltre la fine della settimana della giornata (i risultati importati dall'Excel sono stati inseriti tutti insieme, dopo).
- **Livelli**: un badge si ottiene più volte e mostra il numero (×2, ×3), sommando tutti i tornei. Ogni set vinto 6-0 (anche in una partita persa), ogni rimonta, ogni Muro, ogni capolista battuto e ogni colpo grosso vale un livello; Tris un livello ogni 3 vittorie di fila (6 di fila = 2), Re del tie break ogni 3 vittorie al super tie break, Fotografo ogni 3 partite con foto, Indovino ogni 5 pronostici giusti. Prima vittoria e i badge di fine stagione valgono una volta per torneo.
- **Bordo**: oro per Campione e Oracolo; argento per Podio, Ammazzagrandi, Tris e Re del tie break; bronzo per Cappotto, Rimonta, Muro, Indovino e Colpo grosso.
- **Nel profilo**: tutti i badge con il livello e i tornei in cui sono stati ottenuti (con le partite); gli altri in grigio. Per ciascuno, quanto manca al prossimo livello nel torneo in corso.
- **Card del giocatore**: dal proprio profilo, "Condividi la card" crea un'immagine 1080×1350 con foto, nome, posizione, punti, statistiche e badge ottenuti; si condivide (WhatsApp, Instagram…) o si scarica. È una scelta del giocatore: l'app resta privata (D-009).

## 11. Testa a testa e andamento in classifica (D-064)

- **Andamento**: nel profilo, la posizione in classifica a fine di ogni giornata già iniziata, in un grafico a linea (1° in alto, linea della fase finale segnata). Conta le partite giocate entro la fine della settimana, qualunque sia la loro giornata: un recupero pesa nella settimana in cui si gioca. Toccando il grafico si vedono posizione e punti di quella giornata.
- **Testa a testa** (`/confronto/:a/:b`): si apre dagli "Scontri diretti" del profilo e con "Confronta con te" sul profilo di un altro giocatore. Mostra lo scontro diretto, i numeri affiancati (punti, vinte, giocate, game, differenza game, punti a partita, vittorie al super tie break, badge, punti dei pronostici), l'andamento di tutti e due sullo stesso grafico e i risultati contro gli avversari affrontati da entrambi.
- **Colori**: blu e arancio per i due giocatori, verificati anche per chi confonde rosso e verde; un verde per il grafico di un solo giocatore.

## 12. Meteo della partita (D-065)

- **Dove**: nella scheda di una partita programmata in un circolo della lista e, compatto, nella "tua partita" in Home. Non c'è per partite già giocate, oltre i 16 giorni di previsioni o in un campo scritto a mano (senza posizione).
- **Cosa**: tempo (il peggiore nelle 2 ore della partita), temperatura all'inizio, probabilità di pioggia massima, vento. Con pioggia probabile (≥ 50%) la riga si colora.
- **Fonte**: Open-Meteo, gratuito e senza chiave. Le previsioni le chiede il server (l'indirizzo dei giocatori non esce verso terzi) e le tiene 30 minuti.
- **Posizione dei circoli**: ricavata dal link Google Maps (anche dai link brevi, seguendo i rimandi); se il link non la contiene, dalla città con la ricerca luoghi di Open-Meteo, scegliendo tra gli omonimi quello che corrisponde (es. "Santa Maria degli Angeli, Assisi"). Si ricava all'avvio per i circoli senza posizione e di nuovo quando dal gestionale cambiano link o città; il gestionale segnala i circoli senza posizione.

## 13. Simulatore "cosa ti serve" (D-066)

- **Dove**: nella scheda di una propria partita del girone ancora da giocare, a torneo in corso.
- **Cosa**: otto risultati tipici visti dal giocatore (vinci 6-0 6-0, 6-3 6-3, 7-6 7-6, al super tie break; perdi al super tie break, 6-7 6-7, 3-6 3-6, 0-6 0-6). Per ognuno: i punti presi, la posizione in cui si finirebbe (con quante posizioni si sale o si scende rispetto a oggi) e quella dell'avversario. Toccando un risultato si vede la parte di classifica intorno ai due giocatori come sarebbe.
- **Calcolo**: la classifica vera (stessi risultati, provvisori compresi, e stessi spareggi) con in più la partita simulata. Nessun dato salvato.

## 14. Guida all'app (D-067)

- **Dove**: pagina `/guida`, dalle Impostazioni (ingranaggio del profilo) e, su desktop, dalla barra laterale. Ogni funzione ha accanto un **punto interrogativo** che porta alla sua sezione (`/guida#pronostici`, `/guida#badge`…).
- **Cosa**: tutte le funzioni spiegate ai giocatori, con gli screenshot.
- **Screenshot**: fatti su un **torneo dimostrativo** con giocatori inventati, mai con nomi o risultati veri. Si rifanno con gli script in `scripts/guida/` (vedi il README) quando l'app cambia aspetto.
- **Barra delle sezioni sul telefono**: con Pronostici le voci sono sei e scorrono in orizzontale (si fermano allineate, uno sfumato ai bordi indica che c'è altro, la voce aperta resta in vista).
