---
name: aggiorna-guida
description: Aggiorna la guida all'app TennIsLove (/guida) dopo una nuova funzione o un cambio di aspetto - testi, punti interrogativi e screenshot rifatti sui tornei dimostrativi. Usala quando l'utente chiede di aggiornare la guida, rifare gli screenshot, o quando una modifica cambia una schermata o aggiunge una funzione che i giocatori devono conoscere.
---

# Aggiornare la guida all'app

La guida (D-067, `brain/01-product.md` §14) è la pagina `/guida`: una sezione per funzione, scritta per i giocatori, con gli screenshot. Accanto a ogni funzione nell'app c'è un punto interrogativo (`HelpLink`) che porta alla sua sezione.

Gli screenshot si fanno **solo sui tornei dimostrativi**: giocatori inventati (Andrea Conti e gli altri, email `@example.test`), mai nomi o risultati veri. Lo script crea due tornei: uno **concluso** un anno fa (campione, podio, scelta del torneo) e uno **in corso** con oggi nella quarta giornata (partita di Andrea domani al CUS con meteo e simulatore, un risultato da confermare, pronostici aperti). Le date partono da oggi: lo script funziona in qualunque momento.

## File

| Cosa | Dove |
|---|---|
| Testi e sezioni | `apps/web/src/pages/Guide.tsx` (`SECTIONS`, tipo `GuideId`) |
| Punto interrogativo | `HelpLink` in `apps/web/src/components/ui.tsx`, usato accanto ai titoli |
| Tornei dimostrativi | `apps/api/prisma/demo-guida.ts` (`create` / `remove`) |
| Screenshot | `scripts/guida/screenshots.mjs` → `apps/web/public/guida/*.jpg` e misure in `apps/web/src/guide-images.json` |
| Istruzioni brevi | `scripts/guida/README.md` |

## Procedura

1. **Prerequisiti**: container di sviluppo acceso (`docker compose ps`), app su http://localhost:5173, Google Chrome installato. Chrome viene pilotato senza finestra: l'estensione del browser non serve.

2. **Crea i tornei dimostrativi.** Il token di sessione di Andrea va in un file della scratchpad, mai stampato in chat:
   ```sh
   docker compose exec -T -w /repo/apps/api app node_modules/.bin/tsx prisma/demo-guida.ts create > <scratchpad>/guida-token
   ```
   Finché esistono, il torneo in corso dell'app è quello dimostrativo e tra i tornei da scegliere ci sono solo i dimostrativi (`/api/seasons`): non lasciarli in giro.

3. **Aggiorna i testi** in `Guide.tsx` per quello che è cambiato. Per una funzione nuova:
   - aggiungi l'id a `GuideId` e una sezione in `SECTIONS` (titolo, testo semplice per i giocatori, `images`);
   - metti un `<HelpLink to="<id>" label="..." />` accanto al titolo della funzione nell'app (classe `with-help` sul titolo; `onDark` sui riquadri scuri);
   - aggiungi lo screenshot in `screenshots.mjs` (`go(...)` e `shot(nome, ritaglio)`; `__section('Titolo h2')` ritaglia una sezione, `__rect(elemento, margine)` un elemento).
   Scrivi come per un giocatore che non conosce l'app: cosa fa la funzione, dove si tocca, cosa succede. Niente termini tecnici.

4. **Fai gli screenshot**:
   ```sh
   node scripts/guida/screenshots.mjs <scratchpad>/guida-token
   ```
   Telefono 390×844 ad alta definizione, tema chiaro. Aggiorna anche `guide-images.json` (le misure riservano lo spazio delle immagini: i salti alle sezioni restano precisi).

5. **Guarda ogni screenshot** con Read prima di andare avanti. Problemi già incontrati:
   - cuore di caricamento al posto della pagina: lo script aspetta `#boot` e `[aria-busy]`; se compare ancora, aggiungi un'attesa;
   - barra in basso sopra il contenuto nei ritagli: lo script la nasconde quando c'è un ritaglio;
   - striscia grigia a destra: ritaglio oltre lo schermo (`__rect` lo limita alla larghezza);
   - testo invisibile in pannelli e finestre: è un difetto dell'app (colore ereditato), va corretto nell'app, non nello script.
   Se uno screenshot mostra un difetto dell'app, correggilo e rifai gli screenshot.

6. **Controlla la guida** aprendo `/guida` e `/guida#<id>` (con lo stesso Chrome senza finestra, se l'estensione non è collegata): l'indice evidenzia la sezione giusta, anche l'ultima in fondo alla pagina.

7. **Cancella i tornei dimostrativi** e il file del token:
   ```sh
   docker compose exec -T -w /repo/apps/api app node_modules/.bin/tsx prisma/demo-guida.ts remove
   rm <scratchpad>/guida-token
   ```

8. **Verifica e salva**: `pnpm -s typecheck` in `apps/web` e `apps/api` (dentro il container), poi aggiorna `brain/01-product.md` §14 se cambiano regole o struttura. Commit e push solo se l'utente lo chiede.
