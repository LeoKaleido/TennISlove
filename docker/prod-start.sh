#!/bin/bash
# Avvio della produzione nel container unico: database, API, Nginx e rinnovo dei certificati.
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

# 3. Nginx: con il certificato HTTPS completo, senza solo HTTP per permettere a certbot di ottenerlo
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then template=https; else
  echo "Certificato per ${DOMAIN} assente: avvio solo in HTTP"
  template=http-only
fi
envsubst '${DOMAIN}' < "/etc/nginx/templates/${template}.conf.template" > /etc/nginx/conf.d/tennislove.conf
nginx -g 'daemon off;' &

# 4. rinnovo dei certificati ogni 12 ore (rinnova solo se mancano meno di 30 giorni)
(while sleep 12h; do certbot renew --webroot -w /var/www/certbot --quiet --deploy-hook 'nginx -s reload' || true; done) &

wait -n
stop
exit 1
