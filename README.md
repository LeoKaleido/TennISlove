# TennIsLove

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
docker compose up -d        # un unico container: database, API, web e Mailpit
```

- App: http://localhost:5173
- Email di sviluppo (codici di accesso compresi): http://localhost:8025
- API: http://localhost:3000/api/health

Al primo avvio il database viene creato e riempito con i dati del torneo al 22/10/2026. Per ripartire da zero:

```sh
docker compose exec -w /repo/apps/api app pnpm prisma migrate reset --force
```

Per entrare: apri l'app, inserisci l'email di un giocatore (vedi `apps/api/prisma/seed-data.ts`), scrivi il codice che trovi su Mailpit.

## Comandi utili

```sh
docker compose restart                                                   # dopo aver cambiato le dipendenze
docker compose exec app pnpm -r test                                     # test
docker compose exec app pnpm -r typecheck
docker compose exec -w /repo/apps/api app pnpm prisma migrate dev --name <nome>   # nuova migrazione
docker compose logs -f
```
