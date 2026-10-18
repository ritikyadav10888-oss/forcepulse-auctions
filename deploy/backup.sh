#!/usr/bin/env bash
# Backs up the database and uploaded photos to ~/backups (kept 14 days). setup-server.sh runs it daily.
# Set BACKUP_BUCKET="gs://your-bucket" in .env to also copy each backup to Cloud Storage.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$HOME/backups"
KEEP_DAYS=14
STAMP="$(date +%F-%H%M)"
mkdir -p "$DEST"

# sqlite3 .backup takes a consistent copy while the app is running
sqlite3 "$APP_DIR/prisma/dev.db" ".backup '$DEST/db-$STAMP.db'"
tar -czf "$DEST/uploads-$STAMP.tar.gz" -C "$APP_DIR" uploads
find "$DEST" -type f \( -name 'db-*.db' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete

BUCKET="$(grep -E '^BACKUP_BUCKET=' "$APP_DIR/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
if [ -n "$BUCKET" ]; then
  gcloud storage cp "$DEST/db-$STAMP.db" "$DEST/uploads-$STAMP.tar.gz" "$BUCKET/"
fi
echo "$(date) backup ok: db-$STAMP.db, uploads-$STAMP.tar.gz"
