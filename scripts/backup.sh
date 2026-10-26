#!/bin/sh
# Backup di database e foto in produzione. Tiene gli ultimi 14 giorni.
# Uso: scripts/backup.sh [cartella]   (predefinita: ./backups)
# Sul VPS va in cron ogni notte, es.: 30 3 * * * /home/deploy/tentennis/scripts/backup.sh
set -eu
cd "$(dirname "$0")/.."
DEST=${1:-./backups}
STAMP=$(date +%F)
# i backup contengono dati personali: leggibili solo dal proprietario
umask 077
mkdir -p "$DEST"
C="docker compose -f docker-compose.prod.yml"

$C exec -T app sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "$DEST/db-$STAMP.dump"
$C exec -T app tar -C /data -czf - uploads > "$DEST/uploads-$STAMP.tar.gz"

find "$DEST" -name 'db-*.dump' -mtime +14 -delete
find "$DEST" -name 'uploads-*.tar.gz' -mtime +14 -delete
echo "Backup completato in $DEST"
