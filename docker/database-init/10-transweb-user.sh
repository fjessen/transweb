#!/bin/bash
# Runs once, when MySQL initialises an empty data volume (production compose only).
# Creates the application user `transweb` with rights on the fleetbase, fleetbase_sandbox and
# fleetbase_storefront databases, so the API never connects as root.
# Sourced by the MySQL entrypoint (not executed), so no `set -e`/`-u` here: it would leak into the entrypoint.

if [ -z "${TRANSWEB_DB_PASSWORD:-}" ]; then
    echo "[transweb] TRANSWEB_DB_PASSWORD is empty; refusing to create a passwordless user" >&2
    exit 1  # stop MySQL init loudly rather than start without the app user
fi

docker_process_sql --database=mysql <<-EOSQL
    CREATE USER IF NOT EXISTS 'transweb'@'%' IDENTIFIED BY '${TRANSWEB_DB_PASSWORD}';
    GRANT ALL PRIVILEGES ON \`fleetbase%\`.* TO 'transweb'@'%';
    FLUSH PRIVILEGES;
EOSQL

echo "[transweb] database user 'transweb' created"
