#!/bin/bash
# Avvio della produzione nel container unico: database, API e Nginx.
# Se uno dei programmi si ferma, si ferma il container e Docker lo riavvia (restart: unless-stopped).
set -euo pipefail

stop() {
  kill -TERM $(jobs -p) 2>/dev/null || true
  wait
}
trap stop TERM INT

# 1. database (solo dentro il container: nessuna porta esposta)
docker-entrypoint.sh postgres -c listen_addresses=localhost &
until pg_isready -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q; do sleep 1; done

# 2. API: migrazioni, poi il server, come utente non root
cd /app/apps/api
gosu app ./node_modules/.bin/prisma migrate deploy
gosu app ./node_modules/.bin/tsx src/server.ts &

# 3. Nginx: l'app e il proxy verso l'API, solo HTTP. L'HTTPS e i certificati li gestisce il server davanti al container.
cp /etc/nginx/templates/tennislove.conf /etc/nginx/conf.d/tennislove.conf
nginx -g 'daemon off;' &

wait -n
stop
exit 1
