#!/usr/bin/env bash
# Nightly Transweb backup (installed in root's crontab by migrate-from-local.sh).
# Dumps the three databases + uploaded files to /var/backups/transweb (14 days kept) and, if
# BACKUP_BUCKET is set in .env, copies them to Cloud Storage (bucket lifecycle keeps 30 days).
#
# Restore: gunzip -c db-*.sql.gz | docker exec -i -e MYSQL_PWD=... fleetbase-database-1 mysql -uroot
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT=/var/backups/transweb
STAMP=$(date -u +%Y%m%d-%H%M)
cd "$DIR"
set -a; . ./.env; set +a
mkdir -p "$OUT"

docker exec -e MYSQL_PWD="$DB_ROOT_PASSWORD" fleetbase-database-1 mysqldump -uroot \
    --single-transaction --routines --triggers --events --hex-blob --set-gtid-purged=OFF \
    --databases fleetbase fleetbase_sandbox fleetbase_storefront | gzip > "$OUT/db-$STAMP.sql.gz"
gzip -t "$OUT/db-$STAMP.sql.gz"
tar -czf "$OUT/files-$STAMP.tgz" api/storage/app api/.env .env
chmod 600 "$OUT"/*-"$STAMP".*

find "$OUT" -type f -mtime +14 -delete

if [ -n "${BACKUP_BUCKET:-}" ]; then
    gcloud storage cp "$OUT/db-$STAMP.sql.gz" "$OUT/files-$STAMP.tgz" "$BACKUP_BUCKET/" --quiet
fi
echo "$(date -u +%FT%TZ) backup ok: db-$STAMP.sql.gz ($(du -h "$OUT/db-$STAMP.sql.gz" | cut -f1))"
