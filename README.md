# TennISlove

Web app privata per il torneo di tennis "ATP Umbria Tournament": classifica, calendario, programmazione delle partite e risultati.
La documentazione di progetto (prodotto, decisioni, flussi) è in [`brain/`](brain/README.md).

## Struttura

```
apps/api         Fastify + Prisma (PostgreSQL)
apps/web         React + Vite
packages/shared  motore di punteggio e classifica, usato da api e web
brain/           documentazione
```

## Sviluppo (solo Docker)

Procedura completa, produzione compresa: [`brain/05-runbook.md`](brain/05-runbook.md).

```sh
cp .env.example .env        # la prima volta
docker compose up -d        # db, api, web, mailpit
```

- App: http://localhost:5173
- Email di sviluppo (codici di accesso compresi): http://localhost:8025
- API: http://localhost:3000/api/health

La prima volta, o per ripartire dai dati del torneo al 22/10/2026:

```sh
docker compose exec api pnpm prisma migrate reset --force   # ricrea il db ed esegue il seed
```

Per entrare: apri l'app, inserisci l'email di un giocatore (vedi `apps/api/prisma/seed-data.ts`), scrivi il codice che trovi su Mailpit.

## Comandi utili

```sh
docker compose run --rm install                                   # dopo aver cambiato le dipendenze
docker compose run --rm --no-deps -w /repo install pnpm -r test   # test
docker compose run --rm --no-deps -w /repo install pnpm -r typecheck
docker compose exec api pnpm prisma migrate dev --name <nome>     # nuova migrazione
docker compose logs -f api
```
