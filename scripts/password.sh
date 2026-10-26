#!/bin/sh
# Imposta la password di un utente, senza email. Uso: scripts/password.sh nome@email.it 'password-scelta'
# Serve al primo accesso al gestionale in produzione, o quando la posta non funziona.
set -eu
[ $# -eq 2 ] || { echo "Uso: scripts/password.sh nome@email.it 'password-scelta'"; exit 1; }
cd "$(dirname "$0")/.."
docker compose -f docker-compose.prod.yml exec -T -w /app/apps/api -e LOGIN_EMAIL="$1" -e LOGIN_PASSWORD="$2" app node - < scripts/password.cjs
