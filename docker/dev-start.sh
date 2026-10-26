#!/bin/bash
# Avvio dell'ambiente di sviluppo nel container unico: database, email, dipendenze, API e web.
# Se uno dei programmi si ferma, si ferma il container: Docker lo vede e non resta un ambiente a metà.
set -euo pipefail

stop() {
  kill -TERM $(jobs -p) 2>/dev/null || true
  wait
}
trap stop TERM INT

# 1. database: lo script ufficiale di Postgres crea utente e database al primo avvio
docker-entrypoint.sh postgres &
until pg_isready -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q; do sleep 1; done

# 2. email di sviluppo
mailpit --listen 0.0.0.0:8025 --smtp 0.0.0.0:1025 &

# 3. dipendenze, client del database, migrazioni e dati del torneo (il seed non fa niente se ci sono già)
pnpm install --frozen-lockfile=false
cd /repo/apps/api
pnpm prisma generate
pnpm prisma migrate deploy
pnpm prisma db seed

# 4. API e web
pnpm dev &
cd /repo/apps/web
pnpm dev --host 0.0.0.0 &

wait -n
stop
exit 1
