#!/bin/sh
# Codice di accesso d'emergenza, quando l'email non arriva. Uso: scripts/codice.sh nome@email.it
# Il codice va scritto nell'app dopo aver chiesto "Inviami il codice" con la stessa email.
set -eu
[ $# -eq 1 ] || { echo "Uso: scripts/codice.sh nome@email.it"; exit 1; }
cd "$(dirname "$0")/.."
docker compose -f docker-compose.prod.yml exec -T -w /app/apps/api -e LOGIN_EMAIL="$1" app node - < scripts/login-code.cjs
