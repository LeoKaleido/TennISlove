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
- **Dove**: in Home un riquadro con le partite da pronosticare della settimana, con voto diretto; nella scheda partita la sezione pronostici; in Classifica una scheda "Pronostici" (punti, indovinati su giocati, colpi grossi). A fine stagione il primo è **l'Oracolo**.
