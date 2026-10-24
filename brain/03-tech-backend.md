# Tecnologia — Backend

> Stato: **bozza**. Confermati: TypeScript, **Fastify** (server), **Prisma** (ORM) (D-004), hosting su VPS (D-023).

## Stack proposto

| Area | Scelta | Alternative valutate |
|---|---|---|
| Runtime | Node.js LTS | — |
| Server HTTP | **Fastify** | Express (più lento e meno tipizzato), NestJS (troppo pesante per questo progetto), Hono |
| ORM | **Prisma** | Drizzle (più leggero, SQL-first), Kysely |
| Database | PostgreSQL | SQLite (basterebbe per 12 utenti, ma Postgres semplifica hosting e crescita) |
| Validazione | Zod (con `fastify-type-provider-zod`) | TypeBox |
| Auth | Magic link via email (niente password) + sessione in cookie httpOnly | password, OAuth Google |
| Email | provider transazionale (Resend / Postmark / SES) | |
| File | Object storage S3-compatibile (Cloudflare R2 / S3) con URL firmati | disco locale |
| Job pianificati | conferma automatica dei risultati, promemoria, partite da recuperare (cron o coda leggera, es. pg-boss) | |
| Calendario | generazione `.ics` (es. libreria `ics`) + link Google Calendar | |
| Test | Vitest | |

### Perché Fastify + Prisma
- **Fastify**: tipizzazione TS buona, validazione degli schemi integrata, plugin ufficiali (cookie, multipart, rate-limit, cors), prestazioni elevate.
- **Prisma**: schema dichiarativo leggibile, migrazioni gestite, client tipizzato; produttività alta su un dominio piccolo.
- Punto di attenzione su Prisma: per query aggregate complesse si scende a `$queryRaw`. Qui la classifica la calcola il motore in TS, quindi il problema non si pone.

## Modello dati (prima bozza)

```
Season          id, name ("2026/27"), startsOn, scoringRulesVersion, resultAutoConfirmDays
Phase           id, seasonId, type (ROUND_ROBIN | KNOCKOUT), name, order
Round           id, phaseId, number, startsOn, endsOn            -- "giornata"
Player          id, firstName, lastName, shortName, email, photoUrl, userId?
SeasonPlayer    seasonId, playerId, seedOrder                    -- ordine iniziale (serve per gli ex aequo)
Club            id, name, address, city, mapsUrl, active
Match           id, roundId, code ("G01-03"), playerAId, playerBId,
                scheduledAt?, clubId?, scheduleSeq, status, coverPhotoId?,
                postponedAt?
                -- status: TO_SCHEDULE | SCHEDULED | POSTPONED | TO_RECOVER | PLAYED
MatchResult     matchId, outcome (COMPLETED | TIME_EXPIRED),
                set1A, set1B, set2A?, set2B?, stbA?, stbB?,
                status (PENDING | CONFIRMED | DISPUTED), autoConfirmAt,
                submittedById, submittedAt, confirmedById?, confirmedAt?,
                confirmedAutomatically, disputeNote?
MagicLinkToken  id, userId, tokenHash, expiresAt, usedAt?
Session         id, userId, expiresAt
EmailLog        id, to, template, matchId?, sentAt, providerId
MatchPhoto      id, matchId, uploadedById, storageKey, createdAt
User            id, email, role (PLAYER | ADMIN)
AuditLog        id, actorId, entity, entityId, action, before, after, at
```

Note:
- **Punti e classifica non vengono salvati come verità**: si ricalcolano dal motore partendo dai `MatchResult`. Così un cambio di regolamento retroattivo è solo un ricalcolo. Si può aggiungere una cache/snapshot per giornata se serve lo storico delle posizioni.
- `AuditLog` è indispensabile: chiunque dei due giocatori può inserire o modificare un risultato.

## API (prima bozza)

Tutte le rotte, tranne `/auth/*`, richiedono una sessione (app privata, D-009).
```
POST /auth/magic-link                {email}
GET  /auth/verify?token=...
POST /auth/logout

GET  /season/current
GET  /standings
GET  /rounds                         (calendario con partite)
GET  /matches/:id
GET  /matches/:id/calendar.ics
GET  /players/:id
GET  /gallery

GET  /me/matches
PUT  /matches/:id/schedule           {scheduledAt, clubId}        (solo i due giocatori)
POST /matches/:id/postpone           {note?}                      (solo i due giocatori)
POST /matches/:id/photos/upload-url  -> URL firmato
POST /matches/:id/photos             {storageKey}
PUT  /matches/:id/result             {outcome, sets...}           (solo i due giocatori)
POST /matches/:id/result/confirm                                  (solo l'avversario di chi ha inserito)
POST /matches/:id/result/dispute     {note}                       (solo l'avversario di chi ha inserito)

/admin/*                             CRUD giocatori, circoli, calendario, risultati, fase finale
```

## Hosting
**VPS** (D-023); provider e dettagli da definire più avanti. Ipotesi: Docker Compose con Postgres, API Fastify e reverse proxy (Caddy, che gestisce l'HTTPS in automatico) che serve anche la build statica del FE. Le foto possono stare sul disco del VPS (con backup) oppure su object storage S3-compatibile; da decidere insieme al provider.
