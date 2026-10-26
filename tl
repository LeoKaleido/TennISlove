#!/bin/sh
# TennIsLove in produzione: comandi brevi. Si lancia dalla cartella del progetto sul server, es. ./tl log
# Elenco completo: ./tl aiuto
set -eu
cd "$(dirname "$0")"
DC="docker compose -f docker-compose.prod.yml"

case "${1:-aiuto}" in
  aggiorna) git pull && $DC up -d --build ;;
  avvia) $DC up -d ;;
  ferma) $DC stop ;;
  riavvia) $DC up -d --force-recreate ;;
  stato)
    $DC ps
    printf 'API: '; curl -s http://127.0.0.1:8080/api/health || echo 'non risponde'
    echo ;;
  log) $DC logs -f --tail 100 ;;
  email) $DC logs -f --tail 300 | grep -iE "email|auth/code" ;;
  errori) $DC logs --tail 1000 | grep -iE "error|fallit|emerg" || echo 'Nessun errore recente' ;;
  seed) $DC exec -T -w /app/apps/api app gosu app ./node_modules/.bin/tsx prisma/seed.ts ;;
  password) [ $# -eq 3 ] || { echo "Uso: ./tl password nome@email.it 'password'"; exit 1; }; scripts/password.sh "$2" "$3" ;;
  codice) [ $# -eq 2 ] || { echo "Uso: ./tl codice nome@email.it"; exit 1; }; scripts/codice.sh "$2" ;;
  backup) scripts/backup.sh "${2:-./backups}" ;;
  db) $DC exec app psql -U tentennis tentennis ;;
  *)
    cat <<'AIUTO'
./tl aggiorna                       scarica il codice nuovo e riavvia l'app
./tl avvia | ferma | riavvia        accende, spegne, riavvia (riavvia rilegge anche il .env)
./tl stato                          container e risposta dell'API
./tl log                            tutti i log in tempo reale (Ctrl+C per uscire)
./tl email                          solo i log delle email in tempo reale
./tl errori                         errori recenti
./tl seed                           dati iniziali del torneo (una volta sola)
./tl password EMAIL 'PASSWORD'      imposta la password di un utente, senza email
./tl codice EMAIL                   codice di accesso d'emergenza, senza email
./tl backup                         backup di database e foto in ./backups
./tl db                             console del database
AIUTO
    ;;
esac
