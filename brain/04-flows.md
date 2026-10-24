# Flussi tecnici

> Documento vivo: un flusso per sezione. Ogni flusso indica attori, precondizioni, passi, effetti e casi limite.

## 1. Onboarding giocatore
**Attori**: admin, giocatore.
1. L'admin crea (o importa dal seed) il giocatore con email.
2. Il sistema manda un invito con magic link (D-014).
3. Il giocatore entra, carica la propria foto profilo (D-020) e vede subito "Le mie partite". Senza foto si mostra un avatar con le iniziali.
4. Login successivi: inserisce l'email → riceve il link (monouso, scade dopo 15 minuti) → sessione lunga (es. 90 giorni) in cookie httpOnly, così non deve rifare il login a ogni partita.
5. Le email non presenti tra i giocatori/admin non ricevono nulla: l'app è privata (D-009). Risposta neutra per non rivelare chi è iscritto.

Caso limite: un giocatore senza email resta in anagrafica ma senza accesso; l'admin può agire al suo posto.

## 2. Programmazione di una partita
**Attori**: uno dei due giocatori della partita.
**Precondizione**: partita non ancora giocata.
1. Il giocatore apre la partita e inserisce data, ora e circolo (da lista; **[DA DECIDERE]** se permettere un circolo "altro" scritto a mano).
2. Stato partita: `TO_SCHEDULE → SCHEDULED`.
3. Effetti: compare in Home/Calendario con data e luogo; **entrambi** i giocatori ricevono un'email con allegato `.ics` e link "Aggiungi a Google Calendar"; vengono pianificati i promemoria (§7).
4. Si può riprogrammare finché la partita non è giocata: nuova email con `.ics` aggiornato (stesso `UID`, `SEQUENCE` incrementata, così il calendario aggiorna l'evento invece di duplicarlo). Ogni modifica va nell'audit log.

Casi limite:
- data fuori dalla settimana della giornata → la partita diventa **rinviata** (§2bis), con avviso esplicito nel form.
- data durante la pausa (19/12–10/01) → avviso.

## 2bis. Rinvio di una partita (D-012)
**Attori**: uno dei due giocatori; admin.
**Stati**: `TO_SCHEDULE | SCHEDULED → POSTPONED → SCHEDULED → PLAYED`.
I rinvii li gestiscono **solo i giocatori** (D-018): nessuna approvazione, nessuna scadenza, nessuna penalità.
1. Un giocatore segna la partita come rinviata (eventualmente indicando già la nuova data) oppure la programma direttamente dopo la fine della settimana.
2. La partita resta nella sua giornata ma ha l'etichetta "Rinviata" e, se c'è, la nuova data.
3. A fine settimana, una partita senza risultato e senza data diventa automaticamente "Da recuperare" (solo un'etichetta, non serve nessuna azione dell'admin).
4. In classifica, la colonna "Giocate" mostra chi ha partite arretrate.
5. Una partita mai giocata resta senza risultato e non assegna punti.

Modello: `Match.postponedAt`. Niente `deadline`.

## 3. Selfie di inizio partita
**Attori**: uno dei due giocatori.
1. Dalla partita (programmata o di oggi) → "Carica selfie" → fotocamera/galleria.
2. Il client ridimensiona/comprime (es. lato lungo 2000 px, JPEG ~80%).
3. Il client chiede un URL firmato (`POST /matches/:id/photos/upload-url`), carica sullo storage, poi registra la foto (`POST /matches/:id/photos`).
4. La prima foto diventa la copertina della partita (`Match.coverPhotoId`); la foto compare in gallery.
5. Il selfie è **facoltativo** (D-011): senza foto la copertina è l'immagine di default (logo dell'app), e la gallery mostra solo le foto vere.
6. Incentivo: quando si programma una partita o si inserisce il risultato, l'app propone "Carica il selfie". La foto si può aggiungere anche dopo la partita.
7. Si possono caricare **più foto** per partita (D-021). Uno dei due giocatori può scegliere quale è la copertina; chi ha caricato una foto può cancellarla; l'admin può cancellarle tutte.

## 4. Inserimento del risultato
**Attori**: uno dei due giocatori; admin.
1. Il giocatore sceglie l'esito: **Conclusa** o **Tempo scaduto**.
2. Inserisce i game di set 1 e set 2 e, se i set sono 1–1, il super tie break.
3. Il FE valida in tempo reale con il motore condiviso (§5.2) e mostra l'anteprima dei punti.
4. Il BE rivalida, salva `MatchResult` con stato `PENDING`, registra l'audit, stato partita → `PLAYED`.
5. L'avversario riceve un'email con il riepilogo e i pulsanti **Conferma** / **Contesta** (link firmati, oltre che dall'app).
6. Mentre è `PENDING`, il risultato è visibile a tutti con l'etichetta **"Provvisorio"** (D-010).
7. Transizioni del risultato:
   ```
   PENDING --conferma avversario--------------------> CONFIRMED
   PENDING --nessuna risposta entro X giorni (job)--> CONFIRMED (auto)
   PENDING --contesta (con nota)--------------------> DISPUTED --admin--> CONFIRMED (eventualmente corretto)
   PENDING --chi l'ha inserito lo modifica----------> PENDING (riparte il timer, nuova email)
   CONFIRMED --solo admin---------------------------> corretto/annullato
   ```
   X configurabile per stagione (`Season.resultAutoConfirmDays`, default **2 giorni**, D-016).
   Se l'avversario, invece di confermare, inserisce un punteggio diverso, vale come contestazione.
8. Classifica e statistiche si ricalcolano (§5.4) e la cache viene invalidata.
   I risultati `PENDING` entrano **subito** in classifica, che mostra "include N risultati provvisori"; quelli `DISPUTED` restano fuori finché l'admin non decide (D-017).

## 5. Motore di punteggio e classifica

Fonte: regolamento PDF (punteggio aggiornato al 21/10/2026) + formule dell'Excel (fogli `Calendario` e `Calcoli`), che fanno da specifica di riferimento.

### 5.1 Input
```
outcome: COMPLETED | TIME_EXPIRED
set1: [a, b]          obbligatorio
set2: [a, b] | null
stb:  [a, b] | null   punti del super tie break (non sono game)
```

### 5.2 Validazione
**Esito di un set** (`setOutcome`):
- vuoto → `0` (non giocato);
- non interi, negativi o > 7 → **invalido**;
- `6–0..6–4`, `7–5`, `7–6` → vinto da A (`1`); simmetrico per B (`2`);
- `max ≤ 5`, oppure `6–5`, `5–6`, `6–6` → **in corso** (`0`) — ammesso solo con tempo scaduto;
- altro (es. `7–3`, `7–7`) → invalido.
- Un 7–6 vale 7 e 6 game; i punti del tie break di set non si inseriscono.

**Esito del super tie break** (`stbOutcome`):
- vuoto → `0`;
- non interi o negativi → invalido;
- `max ≥ 10` e scarto ≥ 2: valido se `10–x` con `x ≤ 8`, oppure entrambi ≥ 9 con scarto esatto 2 (es. `11–9`, `12–10`) → vincitore; altrimenti invalido (es. `13–9`);
- altrimenti → in corso (`0`).

**Coerenza dello score**:
- set 1 sempre presente;
- set 2 solo se il set 1 è concluso;
- STB solo se set 1 e set 2 sono conclusi con vincitori diversi.

**Vincitore**:
- set 1 e set 2 conclusi dallo stesso giocatore → lui;
- set divisi → vincitore dell'STB (se concluso), altrimenti nessuno.

**Coerenza dell'esito** (equivalente alla colonna "Messaggio" dell'Excel):
| Condizione | Messaggio |
|---|---|
| niente inserito | Da giocare |
| score invalido | Verifica punteggio |
| Conclusa senza vincitore | Punteggio incompleto |
| Tempo scaduto ma c'è un vincitore | Vincitore definito: usa Conclusa |
| altrimenti | OK → entra in classifica |

### 5.3 Punti della partita
```
gamesA = set1.a + (set2?.a ?? 0)          // STB escluso
gamesB = set1.b + (set2?.b ?? 0)

se TIME_EXPIRED:      puntiA = gamesA; puntiB = gamesB
se vince A in 2 set:  puntiA = gamesA + 3;                         puntiB = gamesB
se vince A all'STB:   puntiA = gamesA + 2 + 1 + max(0, gamesB - gamesA); puntiB = gamesB
(simmetrico per B)
```
Esempi verificati con l'Excel:
- `0–6 6–4 10–8` → 13–10
- `2–6 6–4 10–5` (G01-05) → 8 + 2 comp + 3 = 13 contro 10
- `4–6 6–3 9–11` (G02-05) → A 10, B 9 + 1 comp + 3 = 13

### 5.4 Statistiche per giocatore
Solo le partite "OK":
- giocate, vinte, senza esito (tempo scaduto), perse = giocate − vinte − senza esito;
- game fatti, game subiti, differenza game;
- bonus e compensazioni (somma dei +3 e delle compensazioni);
- **punti = game fatti + bonus e compensazioni**.

### 5.5 Ordinamento e parità
1. Ordine per punti decrescenti.
2. Per ogni gruppo di pari punti:
   - **2 giocatori** → criterio = vittorie nello scontro diretto. Se non hanno ancora giocato o è finita a tempo scaduto → restano ex aequo (comportamento Excel).
   - **≥ 3 giocatori** → criterio 1 = punti fatti nelle partite contro gli altri del gruppo; criterio 2 = differenza game complessiva (su tutte le partite).
3. Parità residua → **stessa posizione** (es. due quarti, poi sesto). In visualizzazione si usa l'ordine dell'elenco iniziale, che non vale come spareggio.
4. Non c'è ricorsione: se in un gruppo di 3 il criterio 1 separa uno ma ne lascia 2 pari, quei 2 non tornano allo scontro diretto (si passa al criterio 2). **[DA CONFERMARE con Giuseppe]**

### 5.6 Zona
- punti = 0 → "Da definire";
- posizione ≤ 8 ma la parità sconfina oltre l'8° → "Parità al taglio";
- posizione ≤ 8 → "Top 8 provv.";
- altrimenti → "Fuori Top 8".

### 5.7 Bug trovato nell'Excel
Nel foglio `Calcoli` le colonne "Pt vs X" e "V vs X" (scontri diretti) cercano l'avversario per nome breve (`"Giuseppe"`, `"Alessandro C"`…), mentre il foglio `Calendario` contiene i nomi completi (`"Giuseppe De Francesca"`…). Il confronto non trova mai corrispondenze: **gli scontri diretti valgono sempre 0** e gli spareggi per scontro diretto/classifica avulsa non funzionano mai. Oggi non ha effetti visibili (i pari punti attuali non si sono ancora incontrati), ma la web app deve implementare la regola corretta e la differenza va segnalata a Giuseppe.

### 5.8 Versioni delle regole
Il regolamento è cambiato il 21/10/2026 con effetto retroattivo. Il motore espone `computeStandings(results, rulesVersion)`; la stagione indica la versione attiva. Cambiare versione vuol dire solo ricalcolare.

## 6. Fase finale (eliminazione diretta)
1. A fine girone l'admin "chiude" la fase: la classifica viene congelata (snapshot).
2. L'admin sceglie lo schema: A (1–5, 2–6, 3–7, 4–8) o B (1–8, 2–7, 3–6, 4–5).
3. Il sistema genera quarti → semifinali → finale.
4. **[DA DECIDERE]**: le partite a eliminazione si giocano con la stessa formula? Come si gestisce il tempo scaduto senza vincitore in una partita a eliminazione? Parità al taglio dell'8° posto?

## 7. Email e calendario (D-013)
Canale unico: **email**. Niente push in v1.

| Evento | Destinatari | Contenuto |
|---|---|---|
| Invito / login | giocatore | magic link |
| Partita programmata o riprogrammata | entrambi | data, ora, circolo (link mappa), allegato `.ics` + link Google Calendar |
| Promemoria (il giorno prima, ore 9) **[orario DA DECIDERE]** | entrambi | riepilogo + invito a caricare il selfie |
| Risultato inserito | avversario | riepilogo + Conferma / Contesta |
| Risultato confermato in automatico | entrambi | avviso |
| Risultato contestato | admin | dettaglio della contestazione |
| Partita da recuperare (fine settimana, senza risultato) | entrambi | invito a programmare il recupero |

Implementazione:
- `.ics` generato dal BE (`VEVENT` con `UID` stabile = id partita, `SEQUENCE` = versione della programmazione, durata 2h, `LOCATION` = circolo). Endpoint `GET /matches/:id/calendar.ics` riusato anche dal pulsante nell'app.
- Link Google Calendar: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&location=...`.
- Job pianificati: conferma automatica dei risultati, promemoria, partite da recuperare.

## 8. Gestionale
- CRUD giocatori, circoli, giornate/partite.
- Override del risultato (con motivo, finisce nell'audit).
- Rimozione foto.
- Import iniziale: seed da `reference/torneo-2026-27.md` (giocatori, calendario, 8 risultati al 22/10/2026) + account admin `giuseppe@kalei.do`, `alessandro@kalei.do` (D-025).

## 9. Import da Excel (D-026)
**Attori**: admin.
1. Carica il file `.xlsx`/`.xlsm` con lo stesso formato del cliente.
2. Il BE legge il foglio `Calendario` (tabella `PartiteATP`: Giornata, Giocatore A/B, Stato, Set 1/2 A/B, STB A/B) e abbina le righe alle partite tramite la coppia di giocatori (l'ID `Gnn-mm` è nella colonna AA).
3. Valida ogni riga con il motore (§5.2); le righe non valide vengono segnalate e non importate.
4. Mostra un'anteprima: nuove, modificate, invariate, in conflitto con risultati inseriti dall'app.
5. Alla conferma salva i risultati come `CONFIRMED` (inseriti dall'admin) e scrive nell'audit.

**[DA DECIDERE]**: in caso di conflitto vince l'Excel o il dato dell'app? Proposta: vince l'app, e il conflitto viene mostrato all'admin.
