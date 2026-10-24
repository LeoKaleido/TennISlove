# History & Decision Log

Registro cronologico di eventi, decisioni e domande aperte. Le voci nuove si aggiungono in fondo a ogni sezione e non si cancellano: se una decisione cambia, se ne aggiunge una nuova che la sostituisce (`Sostituisce D-xxx`).

## Storico

| Data | Evento |
|---|---|
| 12/10/2026 | Parte il torneo ATP Umbria Tournament 2026/27 (giornata 1), gestito con PDF + Excel. |
| 21/10/2026 | Nuovo sistema di punteggio ("Ogni game conta"), retroattivo sulle partite già giocate. |
| 21/10/2026 | Giuseppe De Francesca manda il regolamento, il link all'Excel e la lista dei requisiti della web app. |
| 22/10/2026 | Giuseppe manda la lista dei partecipanti con le email (manca quella di Alessandro Cofanelli). Ultima modifica nota dell'Excel: 8 partite registrate su 66. |
| 24/10/2026 | Avvio del progetto: repo git inizializzato, creata la cartella `brain/` con la documentazione iniziale. Il materiale del cliente è copiato in `brain/sources/`. |
| 24/10/2026 | Analisi delle formule Excel: trovato un bug negli scontri diretti (vedi `04-flows.md` §5.7). |
| 24/10/2026 | Prima sessione di prodotto: decisi visibilità, conferma risultati, selfie, rinvii, promemoria, login (D-009 → D-015). Il progetto è fatto gratis: si punta al prima possibile, senza scadenza fissa. |
| 24/10/2026 | Seconda sessione: conferma automatica dopo 2 giorni, risultati provvisori subito in classifica, rinvii liberi gestiti dai giocatori, niente spettatori (D-016 → D-019). |
| 24/10/2026 | Terza sessione: ricevuta l'email di Alessandro Cofanelli; confermati Fastify + Prisma, app unica con `/admin`, hosting su VPS, più foto per partita, foto profilo caricate dai giocatori (D-004, D-020 → D-023). |
| 24/10/2026 | Preparato per Giuseppe il documento `comunicazioni/2026-10-24_domande-per-Giuseppe.docx`: circoli (Q-007), spareggi e tempo scaduto (Q-010, Q-020), bug Excel (Q-011), fase finale (Q-012). Le decisioni di prodotto non gli vengono sottoposte. |
| 24/10/2026 | Logo fatto in casa, admin Giuseppe + Alessandro con email kalei.do, seed al 22/10 + import Excel (D-024 → D-026). |
| 24/10/2026 | Avviato il mockup su Claude Design (template "Mobile app design") con il prompt in `design/prompt-claude-design.md`. Progetto: https://claude.ai/design/p/cc6089fb-a139-4d26-bb76-0e9e4c8a24ed |
| 24/10/2026 | Mockup accettato ed esportato in `design/mockup/`. Si passa allo sviluppo, tutto su Docker (D-027, D-028, D-029). |
| 24/10/2026 | Rilascio 1 in sviluppo, funzionante in locale: motore di punteggio (47 test, classifica identica all'Excel), API (login magic link, stagione, programmazione con email e .ics, risultato, conferma/contestazione, conferma automatica, admin minimo), frontend (login, home, classifica, calendario, scheda partita, programmazione, inserimento risultato, conferma, profilo, admin). Mancano: selfie e gallery, gestione tornei/circoli/calendario da admin, import Excel, fase finale, deploy. |
| 24/10/2026 | Vocale del responsabile (trascritto in locale): l'admin crea i tornei, iscrive gli atleti con nome, cognome ed email, a loro arriva un'email per entrare; dentro vedono calendario e classifica e caricano la foto dell'incontro; il punteggio segue la formula di Giuseppe. Confronto con lo stato: mancano creazione tornei, iscrizione/invito giocatori dal gestionale, foto. |

## Decisioni

| ID | Data | Decisione | Motivazione | Stato |
|---|---|---|---|---|
| D-001 | 24/10/2026 | Documentazione di progetto in markdown in `brain/` | Unica fonte di verità, versionata con il codice | Accettata |
| D-002 | 24/10/2026 | Frontend e backend in TypeScript | Linguaggio unico, tipi e logica condivisi | Accettata |
| D-003 | 24/10/2026 | Frontend in React | Scelta del team | Accettata |
| D-004 | 24/10/2026 | Backend con Fastify + Prisma | Vedi `03-tech-backend.md` | Accettata (confermata il 24/10/2026) |
| D-005 | 24/10/2026 | Motore di punteggio in TS puro in un pacchetto `shared` usato da FE e BE | Anteprima live nel FE, una sola implementazione | Proposta |
| D-006 | 24/10/2026 | Punti e classifica sempre ricalcolati dai risultati, mai salvati come verità | Il regolamento può cambiare in modo retroattivo (già successo il 21/10) | Proposta |
| D-007 | 24/10/2026 | La specifica di riferimento del punteggio sono le formule Excel, corrette per il bug degli scontri diretti | L'Excel è ciò che il cliente usa e approva oggi | Proposta |
| D-008 | 24/10/2026 | Modello dati con stagioni e fasi multiple | Ritorno e fase finale previsti | Proposta |
| D-009 | 24/10/2026 | App **privata**: tutto è visibile solo agli utenti con login. Nessuna pagina pubblica | Ci sono dati personali, orari e luoghi delle partite | Accettata |
| D-010 | 24/10/2026 | Il risultato inserito da un giocatore resta **provvisorio** finché l'avversario non lo conferma. Gli altri giocatori lo vedono marcato come provvisorio. Senza risposta entro X giorni si **conferma da solo** | Evita errori senza bloccare la classifica | Accettata (valore di X e contestazioni: Q-016, Q-017) |
| D-011 | 24/10/2026 | Selfie **facoltativo** ma incoraggiato. Senza foto, la copertina della partita è un'immagine di default (il logo dell'app, ancora da creare) | Non bloccare l'inserimento del risultato | Accettata |
| D-012 | 24/10/2026 | Il sistema gestisce i **rinvii**: una partita può essere giocata dopo la sua settimana | Succede nella realtà; il regolamento non ne parla | Accettata (regole di dettaglio: Q-018) |
| D-013 | 24/10/2026 | Promemoria via **email** + link **"aggiungi al calendario"** (.ics e Google Calendar). Niente notifiche push in v1 | Semplice, funziona su ogni telefono | Accettata |
| D-014 | 24/10/2026 | Login con **magic link via email**, niente password | Utenti già noti per email, zero attrito | Accettata |
| D-015 | 24/10/2026 | Nessuna scadenza: si va il prima possibile con un MVP piccolo | Progetto non retribuito | Accettata |
| D-016 | 24/10/2026 | Conferma automatica del risultato dopo **2 giorni** | Abbastanza tempo per rispondere, classifica stabile in fretta | Accettata |
| D-017 | 24/10/2026 | I risultati provvisori (`PENDING`) entrano **subito** in classifica, che segnala "include N risultati provvisori". Quelli contestati (`DISPUTED`) restano fuori finché l'admin non decide | Classifica sempre aggiornata, come chiesto dal committente | Accettata |
| D-018 | 24/10/2026 | I rinvii li gestiscono **solo i giocatori**: nessuna approvazione, nessuna scadenza, nessuna penalità. Una partita mai giocata resta semplicemente senza risultato | Caso raro; non vale la pena complicare | Accettata |
| D-019 | 24/10/2026 | Nessun account spettatore: utenti solo giocatori e admin | Coerente con D-009 | Accettata |
| D-020 | 24/10/2026 | Foto profilo caricate da ogni giocatore nel proprio profilo | Niente foto prese dai social, nessun problema di consenso | Accettata |
| D-021 | 24/10/2026 | Più foto per partita; la prima caricata è la copertina, cambiabile da uno dei due giocatori | Più ricordi per la gallery | Accettata |
| D-022 | 24/10/2026 | Una sola app React; gestionale sotto `/admin` (con sottorotte), visibile solo agli admin | Un solo deploy, un solo login | Accettata |
| D-023 | 24/10/2026 | Hosting su VPS (dettagli da definire più avanti) | Costi bassi, controllo completo | Accettata |
| D-024 | 24/10/2026 | Il logo dell'app (usato anche come copertina di default) lo realizza lo sviluppatore | Il cliente non ne ha uno | Accettata |
| D-025 | 24/10/2026 | Amministratori: Giuseppe e Alessandro, con account admin dedicati creati dallo sviluppatore: `giuseppe@kalei.do`, `alessandro@kalei.do`. Sono separati dagli account giocatore (Giuseppe gioca con la gmail, Alessandro gioca con `alessandro@kalei.do`) | Ruoli distinti | Accettata (vedi Q-021) |
| D-026 | 24/10/2026 | Seed iniziale con i risultati dell'Excel al 22/10/2026. L'admin potrà aggiornare risultati (e calendario) **importando un file Excel nello stesso formato** di quello del cliente | Il cliente continua a usare l'Excel finché l'app non è operativa | Accettata |
| D-027 | 24/10/2026 | Sviluppo interamente su **Docker** (compose: Postgres, API, web, Mailpit per le email di sviluppo). Nessun Node sul Mac; stessa impostazione in produzione sul VPS | Ambiente riproducibile, identico tra dev e VPS | Accettata |
| D-028 | 24/10/2026 | Il mockup di Claude Design (`design/mockup/`) è il riferimento UI. Introduce: gestione di **più tornei/stagioni** con archivio consultabile dalla Classifica, procedura "Nuovo torneo" in 4 passi (dati e posti in fase finale, giocatori e circoli, date e pause, calendario generato in automatico e rimescolabile), checkbox "Tempo scaduto" nell'inserimento risultato, pulsante "Sollecita" per le partite da recuperare, slot orari 18:00-21:00 + "Altra data", tema chiaro/scuro scelto dal profilo | Validato dallo sviluppatore su Claude Design | Accettata |
| D-029 | 24/10/2026 | Lo stato di una partita è **derivato**, non salvato: risultato (Provvisoria / Confermata / Contestata) oppure, senza risultato, data dopo la settimana o rinvio esplicito = Rinviata, data nella settimana = Programmata, settimana passata = Da recuperare, altrimenti Da programmare | Nessuna incoerenza tra campi, nessun job per cambiare stato | Accettata |
| D-030 | 24/10/2026 | Email: in sviluppo **Mailpit** (nessuna email esce); in produzione **Resend** via SMTP (piano gratuito: 2.500/mese secondo la pagina prezzi vista il 24/10/2026, limite giornaliero da verificare), dominio verificato con SPF/DKIM, preferibilmente un sottodominio dedicato (es. `atp.kalei.do`). Niente invio diretto dal VPS | Consegna affidabile, zero costi al nostro volume, codice invariato (solo variabili SMTP) | Accettata (dominio da definire) |
| D-031 | 24/10/2026 | Confermato il magic link (D-014) dopo verifica dei volumi: sessione di 90 giorni, quindi circa un login ogni 3 mesi per dispositivo. Limite di 3 link all'ora per email | Restiamo molto sotto la quota gratuita di Resend (stima: poche centinaia di email al mese) | Accettata |
| D-032 | 24/10/2026 | Stile del frontend con CSS semplice e token (variabili CSS) presi dal mockup, invece di Tailwind | Il mockup è già scritto con quei token; una dipendenza in meno | Accettata (sostituisce la proposta Tailwind in 02-tech-frontend) |
| D-033 | 24/10/2026 | L'app scarica in una sola chiamata (`GET /api/season`) tutta la stagione: giocatori, giornate, partite con stato e punti, classifica. Le schermate derivano i dati da lì | 66 partite = pochi KB; codice più semplice, navigazione istantanea | Accettata |
| D-034 | 24/10/2026 | Correzioni dei risultati solo dal **gestionale**, con un pannello desktop; i risultati inseriti da lì sono subito confermati (`PUT /api/admin/matches/:id/result`). Dall'app mobile inseriscono e correggono solo i due giocatori della partita | Il gestionale non deve rimandare a schermate mobili | Accettata |
| D-035 | 24/10/2026 | Account **creati dall'admin** nel gestionale (nome, cognome, nome breve, email) con pulsante **Invita**: arriva un'email con il link per entrare (magic link con validità più lunga, 7 giorni). Gli accessi successivi restano via magic link (D-014). Niente password | Allineato al vocale del responsabile (account preparato dall'admin, email per entrare) senza gestire password | Accettata |

## Domande aperte

| ID | Domanda | Per chi | Stato |
|---|---|---|---|
| Q-001 | Il sito è pubblico o visibile solo agli iscritti? | Giuseppe | Chiusa → D-009 |
| Q-002 | Login giocatori: magic link via email va bene? | Team | Chiusa → D-014 |
| Q-003 | Il risultato inserito da un giocatore vale subito o serve la conferma dell'avversario? | Giuseppe | Chiusa → D-010 |
| Q-004 | Il selfie è obbligatorio? Una foto o più per partita? | Giuseppe | Chiusa → D-011, D-021 |
| Q-005 | Partite giocate fuori dalla settimana prevista: consentite? | Giuseppe | Chiusa → D-012 (dettagli in Q-018) |
| Q-006 | Canale dei promemoria: email, push, calendario (.ics)? | Team/Giuseppe | Chiusa → D-013 |
| Q-007 | Lista dei circoli (nome, indirizzo). | Giuseppe | Aperta (nel docx) |
| Q-008 | Email di Alessandro Cofanelli. | Giuseppe | Chiusa → alessandro@kalei.do |
| Q-009 | Foto profilo: le mandano i giocatori o le prendiamo dai social? | Giuseppe | Chiusa → D-020 |
| Q-010 | Spareggio a 2 senza scontro diretto giocato: ex aequo (come l'Excel) o differenza game? E la ricorsione nella classifica avulsa a 3+? Ultimo criterio dopo la differenza game? | Giuseppe | Aperta (nel docx) |
| Q-011 | Segnalare a Giuseppe il bug degli scontri diretti nell'Excel. | Team | Nel docx |
| Q-012 | Fase finale: formula delle partite, gestione del tempo scaduto in eliminazione diretta, parità all'8° posto. | Giuseppe | Aperta (nel docx) |
| Q-013 | Una sola app (pubblico + gestionale) o due app separate? | Team | Chiusa → D-022 |
| Q-014 | Hosting e budget. | Team | Chiusa in parte → D-023 (provider e setup da definire) |
| Q-015 | Scadenza: l'app serve entro quale giornata? (oggi siamo alla giornata 2) | Giuseppe/capo | Chiusa → D-015 |
| Q-016 | Conferma automatica: quanti giorni (X)? | Team/Giuseppe | Chiusa → D-016 |
| Q-017 | Il risultato provvisorio entra subito in classifica? Chi decide le contestazioni? | Giuseppe | Chiusa → D-017 |
| Q-018 | Rinvii: chi li decide, con quale scadenza, cosa succede alle partite mai giocate? | Giuseppe | Chiusa → D-018 |
| Q-019 | Visitatori senza account (amici, familiari): servono? | Giuseppe | Chiusa → D-019 |
| Q-020 | Tempo scaduto a partita avanzata (un set vinto + avanti nel secondo, o STB in corso): nessun vincitore, solo game? | Giuseppe | Aperta (nel docx) |
| Q-021 | Alessandro usa `alessandro@kalei.do` sia come giocatore sia come admin: un unico utente con entrambi i ruoli (consigliato) o serve un'altra email? | Team | Aperta |
