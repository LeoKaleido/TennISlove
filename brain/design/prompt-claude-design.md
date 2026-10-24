Crea il mockup ad alta fedeltà di una web app mobile-first (in italiano) per gestire un torneo di tennis amatoriale tra amici: "ATP Umbria Tournament" (sottotitolo "Amici Tennis · Pre-cena"), stagione 2026/27.

## Contesto
- 12 giocatori, girone all'italiana di sola andata: 11 giornate, 66 partite, 6 partite a settimana.
- Il calendario fissa solo la SETTIMANA di ogni partita: giorno, ora e circolo li decidono i due giocatori.
- Si usa quasi solo da telefono, spesso a bordo campo (selfie, inserimento risultato). Deve funzionare anche su desktop.
- App privata: si entra solo con login via magic link (si inserisce l'email e si riceve un link, niente password).
- Ruoli: giocatore (vede tutto, agisce solo sulle proprie partite) e admin (gestionale sotto /admin).

## Regole di punteggio (da mostrare chiaramente)
- Partita: 2 ore, due set; con un set pari il terzo set è un super tie break a 10 (STB). Se scadono le 2 ore senza vincitore = "Tempo scaduto".
- Vittoria in 2 set: game vinti + 3. Vittoria all'STB: game + 2 + 1 + compensazione (se il vincitore ha fatto meno game dello sconfitto, riceve la differenza). Sconfitta o tempo scaduto: solo game vinti.
- Esempio: 0–6 6–4 10–8 → vincitore 13 punti, sconfitto 10.
- I primi 8 accedono alla fase finale a eliminazione diretta (quarti).

## Schermate da disegnare
1. Login: email + "Inviami il link", poi lo stato "Controlla la tua email".
2. Home: giornata in corso (es. "Giornata 3 · 26 ott – 1 nov"), la mia prossima partita in evidenza (avversario, stato, CTA "Programma" o "Inserisci risultato"), partite programmate degli altri (data/ora/circolo), ultimi risultati, mini classifica top 5.
3. Classifica completa: Pos, Giocatore (avatar), Punti, Giocate, Vinte, Perse, Senza esito, Game fatti, Game subiti, Diff. game, Bonus e comp., Zona (Top 8 provv. / Parità al taglio / Fuori Top 8 / Da definire). Linea di taglio dopo l'8°. Banner "Include 2 risultati provvisori". Su mobile: tabella con prime colonne fisse e scroll orizzontale, oppure card espandibili.
4. Calendario: le 11 giornate (pausa natalizia 19 dic – 10 gen), ogni partita con stato: Da programmare · Programmata · Rinviata · Da recuperare · Giocata (provvisoria / confermata) · Contestata.
5. Scheda partita: foto di copertina grande (selfie; se manca, immagine di default con il logo), giocatori, settimana, data/ora/circolo, punteggio per set + STB, punti assegnati a ciascuno, badge Provvisorio/Confermato, galleria foto della partita, pulsante "Aggiungi al calendario".
6. Programma partita (bottom sheet o pagina): data, ora, circolo da elenco. Avviso se la data è fuori dalla settimana ("la partita risulterà rinviata").
7. Inserisci risultato: scelta "Conclusa" / "Tempo scaduto"; stepper grandi per i game di set 1 e set 2 (0–7) per ciascun giocatore; campi STB che compaiono solo se i set sono 1–1; validazione live con messaggio; anteprima dei punti in tempo reale ("Tu 13 · Avversario 10").
8. Conferma risultato (vista dell'avversario): riepilogo, pulsanti "Conferma" e "Contesta" (con nota), testo "Si conferma automaticamente tra 2 giorni".
9. Carica selfie: fotocamera/galleria, anteprima, più foto per partita, scelta della copertina.
10. Gallery: griglia di foto, ogni foto porta alla sua partita.
11. Profilo giocatore: foto, statistiche, partite giocate e da giocare, scontri diretti.
12. Admin (/admin): dashboard con contestazioni aperte e partite da recuperare; liste Giocatori, Circoli, Calendario, Risultati (modifica/forza conferma); "Importa Excel" con anteprima delle differenze (nuove / modificate / in conflitto).

## Dati realistici da usare
Giocatori: Giuseppe De Francesca, Alessio Panfili, Federico Piccioni, Marco Rondoni, Alessandro Piccioni, Michele Giancarlo, Fabrizio Ricci, Leonardo Panfili, Luca Ceccarelli, Gennaro Carucci, Francesco Artegiani, Alessandro Cofanelli.
Classifica attuale: Federico 30 · Alessio 28 · Alessandro P 25 · Giuseppe 15 · Marco 15 · Francesco 13 · Leonardo 10 · Fabrizio 6 · Luca 6 · Gennaro 5 · Michele 4 · Alessandro C 3.
Risultati: Giuseppe–Luca 6–2 6–2 (15–4) · Francesco–Leonardo 2–6 6–4 10–5 (13–10) · Alessandro P–Alessio 4–6 6–3 9–11 (10–13) · Luca–Federico 0–6 2–6 (2–15).
Giornata 3 (26 ott – 1 nov): Giuseppe–Federico · Michele–Gennaro · Luca–Leonardo · Marco–Alessio · Alessandro C–Fabrizio · Alessandro P–Francesco.
Circoli: usa nomi segnaposto (es. "Circolo Tennis Perugia", "TC Ponte San Giovanni").

## Stile
- Ispirato al PDF del regolamento: blu notte quasi nero (#0B1A24), verde menta chiaro (#C6EEDB), verde scuro per gli accenti (#1F6F54), bianco. Sans-serif bold e compatto per i titoli, look sportivo e pulito, angoli arrotondati.
- Il logo non esiste ancora: usa un segnaposto semplice (racchetta stilizzata + due palline).
- Light mode come principale; prevedi anche il dark mode.
- Navigazione mobile: tab bar in basso (Home, Calendario, Classifica, Gallery, Profilo).
