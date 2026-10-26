# Regolamento

> **Regola d'oro**: l'app applica solo le regole scritte qui. Se una funzione richiede una regola che qui non c'è, non la si inventa: si chiede a Giuseppe e si aggiunge qui, con la fonte, prima di scrivere il codice.

Fonti:
- **PDF**: `sources/ATP_Umbria_Tournament_regolamento_calendario_2026-27.pdf`, punteggio aggiornato al 21/10/2026.
- **G-26/10**: risposte di Giuseppe del 26/10/2026, `comunicazioni/2026-10-26_risposte-di-Giuseppe.docx`.
- **Excel**: `sources/ATP_Umbria_calendario_classifica_OK.xlsm`, usato come specifica dove il PDF non entra nel dettaglio (validazione del punteggio).
- **D-xxx**: decisioni nel decision log, per le regole di gestione nate con l'app.

Il dettaglio algoritmico (formule, validazione, esempi verificati) sta in `04-flows.md` §5. Questo documento dice **cosa** vale; quello **come** si calcola.

---

## 1. Formula del torneo

- **Girone unico all'italiana**: ognuno incontra tutti gli altri una volta. *(PDF)*
  - 2026/27: 12 giocatori, 11 giornate, 66 partite, 6 a settimana.
- **Una partita a settimana** per giocatore. *(PDF)*
- **Giornata = settimana**: il calendario fissa la settimana entro cui giocare, non giorno, ora o circolo. *(PDF)*
- **Pausa 2026/27**: dal 19/12/2026 al 9/01/2027. La giornata 10 finisce venerdì 18/12, la giornata 11 è dall'11 al 17/01/2027. *(PDF)*
- **Girone di ritorno**: non previsto nel calendario 2026/27; se si fa, **classifica e punti continuano** come in un normale campionato. *(PDF, G-26/10)*
  - **Non definito**: come si genera il calendario del ritorno (stesso ordine? accoppiamenti invertiti?). Da chiedere prima di implementarlo.
- **Fase finale**: rimandata, per ora non esiste. *(G-26/10, D-041)* Vedi §7.

## 2. Organizzazione delle partite

- **Chi decide**: i due giocatori concordano giorno e ora e scelgono il circolo più comodo per entrambi. *(PDF)*
- **Circoli**: quelli in elenco, ma si può giocare anche in **campi non in lista**. *(G-26/10, D-040)*
  - Elenco 2026/27: Tennis Country (ex 3T), Tennis Training School, Sporting Club Torgiano, ASD Mariquita Sporting Club, Gryphus Sporting Club, Pattol Club, Centro Sportivo Tennis Chiugiana, Circolo Tennis Foligno, CUS Perugia. Dettagli e link in `reference/torneo-2026-27.md`.
- **Rinvii**: liberi, li gestiscono i giocatori. Nessuna approvazione, scadenza o penalità. *(D-012, D-018)*
- **Partita mai giocata**: resta senza risultato e non assegna punti. *(D-018)*

## 3. Formula della partita

- **Durata**: 2 ore. *(PDF)*
- **Set**: due set regolari. *(PDF)*
- **40–40**: il primo vantaggio si gioca normalmente. Se si torna sul 40–40, **killer point**: chi lo vince prende il game. *(PDF)*
- **Set pari**: il terzo set è un **super tie break a 10**. *(PDF)*
- **Fine del tempo**: allo scadere delle 2 ore si chiude il game in corso e vale il risultato raggiunto. *(PDF)*
- **Tempo scaduto senza vincitore**: anche a partita avanzata (un set vinto e avanti nel secondo, oppure super tie break in corso) non c'è vincitore; ciascuno prende i game vinti, i punti del super tie break non contano. *(G-26/10)*
- **Punteggi validi** *(Excel)*:
  - set concluso: 6–0…6–4, 7–5, 7–6 (il tie break del set non si inserisce);
  - set in corso (fino a 6–6): ammesso solo con tempo scaduto;
  - super tie break: 10–x con x ≤ 8, oppure oltre il 10 con 2 punti di scarto esatti (11–9, 12–10…).

## 4. Punti ("Ogni game conta")

*(PDF, in vigore dal 21/10/2026 e applicato anche alle partite già giocate)*

| Esito | Punti |
|---|---|
| Vittoria in due set | game vinti + 3 |
| Vittoria al super tie break | game vinti + 2 (vittoria) + 1 (STB) + compensazione |
| Sconfitta in due o tre set | solo game vinti |
| Tempo scaduto senza vincitore | solo game vinti, ciascuno |

- **Compensazione**: se chi vince al super tie break ha meno game dello sconfitto, riceve la differenza; con game pari o superiori è zero. Il vincitore ha così almeno 3 punti in più.
- **Punti del super tie break**: non sono game; la vittoria del super tie break vale solo il punto aggiuntivo.
- **Esempio** 0–6 6–4 10–8: vincitore 6 game + 4 compensazione + 2 + 1 = 13, sconfitto 10.
- **Cambi di regolamento**: valgono anche per le partite già giocate, si ricalcola tutto. *(PDF)*

## 5. Classifica e parità

- **Ordine**: per punti. *(PDF)*
- **Due a pari punti**: prevale lo scontro diretto. *(PDF)*
  - se non si sono ancora incontrati, o la loro partita è finita a tempo scaduto senza vincitore: restano **a pari merito**. *(G-26/10)*
- **Tre o più a pari punti** *(PDF, G-26/10)*:
  1. punti ottenuti negli scontri tra loro;
  2. se la parità persiste, differenza game complessiva.
  - Se il criterio 1 separa solo alcuni, quelli rimasti pari passano direttamente al criterio 2, senza tornare allo scontro diretto.
- **Parità dopo tutti i criteri**: stessa posizione. *(G-26/10)*
- **Quando conta**: gli spareggi pesano davvero a campionato concluso; durante il torneo servono solo a leggere la classifica. *(G-26/10)*

## 6. Risultati: inserimento e conferma

Regole di gestione nate con l'app *(D-010, D-016, D-017, D-034)*:
- **Chi inserisce**: uno dei due giocatori della partita.
- **Provvisorio**: il risultato inserito è provvisorio ed **entra subito in classifica**.
- **Conferma**: lo conferma o lo contesta l'avversario; senza risposta si conferma da solo dopo **2 giorni**.
- **Contestato**: esce dalla classifica finché decide un amministratore.
- **Correzioni** di un risultato confermato: solo un amministratore, dal gestionale.

## 7. Casi non coperti

Qui non c'è una regola: **non si implementa** finché non arriva da Giuseppe.
- **Fase finale**: formula delle partite, tempo scaduto senza vincitore in eliminazione diretta, parità all'8° posto, finale 3°/4° posto. Il PDF prevedeva i primi 8 ai quarti con incroci A (1–5, 2–6, 3–7, 4–8) o B (1–8, 2–7, 3–6, 4–5), ma Giuseppe l'ha messa da parte. *(G-26/10)*
- **Calendario del girone di ritorno** (vedi §1).
- **Ritiro di un giocatore** a torneo in corso: cosa succede alle partite giocate e a quelle da giocare.
- **Partita non disputata per colpa di uno dei due** (forfait, mancata presentazione): oggi non esiste la vittoria a tavolino.
- **Ritiro durante la partita** (infortunio).
