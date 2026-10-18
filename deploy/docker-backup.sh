#!/usr/bin/env bash
# Backs up the database and photos of the Docker setup to ./data/backups (kept 14 days).
# install-docker.sh runs it daily; run it by hand with:  sudo bash deploy/docker-backup.sh
# Copy ./data/backups to another machine or cloud storage now and then, in case the server's disk fails.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"
if docker compose version >/dev/null 2>&1; then COMPOSE="docker compose"; else COMPOSE="docker-compose"; fi
STAMP="$(date +%F-%H%M)"
KEEP_DAYS=14
mkdir -p data/backups

# sqlite3 .backup takes a consistent copy while the app is running
$COMPOSE exec -T app sqlite3 /data/forcepulse.db ".backup '/data/backups/db-$STAMP.db'"
tar -czf "data/backups/uploads-$STAMP.tar.gz" -C data uploads
find data/backups -type f \( -name 'db-*.db' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete
echo "$(date) backup ok: db-$STAMP.db, uploads-$STAMP.tar.gz"
