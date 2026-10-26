#!/bin/sh
# Sceglie la configurazione di Nginx prima dell'avvio:
# - certificato presente: HTTPS completo;
# - certificato assente (primo avvio): solo HTTP, per permettere a certbot di ottenerlo.
# Poi ricarica Nginx ogni 6 ore, così prende i certificati rinnovati.
set -eu
mkdir -p /etc/nginx/templates
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  cp /etc/nginx/templates-available/https.conf.template /etc/nginx/templates/default.conf.template
else
  echo "Certificato per ${DOMAIN} assente: avvio solo in HTTP"
  cp /etc/nginx/templates-available/http-only.conf.template /etc/nginx/templates/default.conf.template
fi
(while sleep 21600; do nginx -s reload; done) &
