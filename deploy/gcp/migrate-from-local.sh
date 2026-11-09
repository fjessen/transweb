#!/usr/bin/env bash
# Moves the running local Transweb install to the Google Cloud VM made by create-vm.sh.
# Run from your PC (Git Bash), from the dev repo root:
#
#   PROJECT_ID=transweb-prod ZONE=europe-west1-b ACME_EMAIL=you@example.com deploy/gcp/migrate-from-local.sh
#
# Steps: server setup -> copy api/.env (APP_KEY!), uploads and a fresh database dump -> build images
# on the server -> restore the database -> start everything -> install the nightly backup.
# The local stack is NOT stopped or changed (only read), so you can re-run the migration.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?set PROJECT_ID}"
ZONE="${ZONE:-europe-west1-b}"
VM_NAME="${VM_NAME:-transweb-1}"
ACME_EMAIL="${ACME_EMAIL:?set ACME_EMAIL (Let's Encrypt notices)}"
LOCAL_INSTALL="${LOCAL_INSTALL:-/c/Users/felne/TransWeb-stack/fleetbase}"
LOCAL_DB_CONTAINER="${LOCAL_DB_CONTAINER:-fleetbase-database-1}"
BUCKET="${BUCKET:-${PROJECT_ID}-transweb-backups}"
REMOTE_DIR=/opt/transweb/fleetbase

export MSYS_NO_PATHCONV=1
g() { gcloud --project "$PROJECT_ID" "$@"; }
remote() { g compute ssh "$VM_NAME" --zone "$ZONE" --command "$1"; }

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "==> 1/6 Server setup"
g compute ssh "$VM_NAME" --zone "$ZONE" --command "ACME_EMAIL='$ACME_EMAIL' bash -s" < "$(dirname "$0")/../server-setup.sh"
remote "cd $REMOTE_DIR && sed -i 's#^BACKUP_BUCKET=\$#BACKUP_BUCKET=gs://$BUCKET#' .env && grep '^BACKUP_BUCKET=' .env"

echo "==> 2/6 Local database dump"
docker exec "$LOCAL_DB_CONTAINER" mysqldump --single-transaction --routines --triggers --events --hex-blob \
    --set-gtid-purged=OFF --databases fleetbase fleetbase_sandbox fleetbase_storefront | gzip > "$WORK/transweb.sql.gz"
gzip -t "$WORK/transweb.sql.gz"
ls -la "$WORK/transweb.sql.gz"

echo "==> 3/6 Copy api/.env, uploads and dump to the server"
tar -C "$LOCAL_INSTALL" -czf "$WORK/files.tgz" api/.env api/storage/app
g compute scp --zone "$ZONE" "$WORK/transweb.sql.gz" "$WORK/files.tgz" "$VM_NAME:/tmp/"
remote "cd $REMOTE_DIR && tar -xzf /tmp/files.tgz && chmod 600 api/.env && grep -q '^APP_KEY=base64:' api/.env && echo 'api/.env OK (APP_KEY present)'"

echo "==> 4/6 Build images on the server (console build takes 20-40 min)"
remote "cd $REMOTE_DIR && sudo docker compose build"

echo "==> 5/6 Database: start, wait, restore"
remote "set -e; cd $REMOTE_DIR
sudo docker compose up -d database cache
for i in \$(seq 1 90); do
  [ \"\$(sudo docker inspect -f '{{.State.Health.Status}}' fleetbase-database-1)\" = healthy ] && break; sleep 5
done
sudo docker inspect -f 'database: {{.State.Health.Status}}' fleetbase-database-1
set -a; . ./.env; set +a
gunzip -c /tmp/transweb.sql.gz | sudo docker exec -i -e MYSQL_PWD=\"\$DB_ROOT_PASSWORD\" fleetbase-database-1 mysql -uroot
sudo docker exec -e MYSQL_PWD=\"\$DB_PASSWORD\" fleetbase-database-1 mysql -utransweb -N -e 'SELECT COUNT(*) AS users FROM fleetbase.users'
rm -f /tmp/transweb.sql.gz /tmp/files.tgz"

echo "==> 6/6 Start everything + nightly backup"
remote "set -e; cd $REMOTE_DIR
sudo docker compose up -d
( sudo crontab -l 2>/dev/null | grep -v transweb-backup; echo '30 2 * * * $REMOTE_DIR/deploy/backup.sh >> /var/log/transweb-backup.log 2>&1 # transweb-backup' ) | sudo crontab -
sudo docker compose ps --format 'table {{.Service}}\t{{.Status}}'
grep -E '^(APP_DOMAIN|API_DOMAIN)=' .env"

echo "Done. Open https://<APP_DOMAIN> (first HTTPS request can take ~30 s while certificates are issued)."
