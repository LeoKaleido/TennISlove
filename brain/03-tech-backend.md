# Tecnologia — Backend

> Stato: in uso. TypeScript, Fastify 5, Prisma 6, PostgreSQL 17 (D-004). Hosting su VPS con Docker (D-023, D-039).

## Stack

| Area | Scelta |
|---|---|
| Server | Fastify 5 (`apps/api/src/server.ts`) |
| Database | PostgreSQL 17 via Prisma 6 |
| Validazione | Zod 4 sui body delle richieste |
| Login | password dell'invito (hash scrypt, blocco dopo 5 errori) o codice di 6 cifre via email + sessione in cookie httpOnly di 90 giorni (D-049, D-060) |
| Email | nodemailer via SMTP: Mailpit in sviluppo, casella su Plesk in produzione (D-055). Log delle impostazioni all'avvio e di ogni invio, con i codici mascherati |
| Foto | su disco (`UPLOAD_DIR`), servite solo con login (D-038) |
| Calendario | file `.ics` scritto a mano (`ics.ts`) + link Google Calendar |
| Script | `scripts/backup.sh` (database e foto), `scripts/codice.sh` (codice d'emergenza), `scripts/password.sh` (imposta una password dal server), `pnpm seed:excel` (risultati del seed dall'Excel) |
| Lavori periodici | `setInterval` ogni 5 minuti (`jobs.ts`): conferma automatica dei risultati, pulizia di sessioni e codici scaduti |
| Test | Vitest sul motore in `packages/shared` |

Perché Fastify + Prisma: buona tipizzazione, plugin ufficiali (cookie, multipart), schema e migrazioni leggibili. La classifica la calcola il motore in TypeScript, quindi non servono query SQL complesse.

## Modello dati

La fonte è `apps/api/prisma/schema.prisma`, commentato. Punti chiave:
- **Punti e classifica non si salvano**: si ricalcolano dai risultati a ogni richiesta. Un cambio di regolamento retroattivo è solo un ricalcolo.
- **Stato della partita derivato** da risultato, data e rinvio (D-029), non salvato.
- **`Match.venue`**: campo scritto a mano, in alternativa al circolo (D-040).
- **`LoginCode`**: codici di accesso, salvati solo come hash, con il numero di tentativi.
- **`AuditLog`**: ogni modifica a risultati, programmazione, giocatori e foto.

## API

Tutto sotto `/api`. Tranne `/api/auth/*` e `/api/health`, serve il login. Le rotte `/api/admin/*` sono solo per gli amministratori.

| Area | Rotte |
|---|---|
| Accesso | `POST auth/password` (email + password), `POST auth/code` (manda il codice), `POST auth/login` (email + codice), `POST auth/logout`, `GET me`, `POST me/password` (cambia password) |
| Torneo | `GET season` (in corso, o `?id=`), `GET seasons` |
| Partite | `GET matches/:id`, `GET matches/:id/calendar.ics`, `PUT matches/:id/schedule`, `POST matches/:id/postpone` |
| Risultati | `PUT matches/:id/result`, `POST matches/:id/result/confirm`, `POST matches/:id/result/dispute` |
| Foto | `POST matches/:id/photos`, `PUT matches/:id/cover`, `GET`/`DELETE photos/:id`, `GET gallery`, `POST me/photo`, `GET players/:id/photo` |
| Gestionale | `admin/people`, `admin/players`, `admin/users/:id/invite`, `admin/seasons` (+ `activate`, `archive`), `admin/clubs`, `admin/matches/:id/result` (+ `force-confirm`) |

Chi può fare cosa:
- **Programmare, rinviare, inserire il risultato, caricare foto**: solo i due giocatori della partita.
- **Confermare o contestare**: solo l'avversario di chi ha inserito.
- **Correggere un risultato confermato**: solo l'admin, dal gestionale (D-034).
- Con il torneo non in corso le azioni dei giocatori sono bloccate.

## Sicurezza (D-043)
Dettaglio delle protezioni attive in `05-runbook.md`, sezione "Protezioni già attive".

## Hosting
VPS con un **unico container** (D-054, `docker-compose.prod.yml`): Postgres, API e **Nginx**, che serve la build del web e inoltra `/api`, solo HTTP su `127.0.0.1:8080`. **HTTPS e certificati li gestisce il web server del server** (D-056), che inoltra al container. Stessa impostazione in sviluppo, con Vite e Mailpit al posto di Nginx. Procedura completa in `05-runbook.md`.
