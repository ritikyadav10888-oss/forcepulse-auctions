#!/usr/bin/env bash
# Puts new code live. Upload forcepulse-update.zip (code only: no .env, database or photos) next to
# the project folder, then from the project folder run:
#   bash deploy/update.sh ../forcepulse-update.zip
set -euo pipefail

# Everything is inside main() so bash has read the whole script before the zip replaces this file
main() {
  local APP_DIR ZIP
  APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
  ZIP="${1:-}"
  cd "$APP_DIR"

  echo "==> Backup first"
  bash deploy/backup.sh

  if [ -n "$ZIP" ]; then
    echo "==> Unpacking $ZIP"
    # The update zip has no .env, prisma/dev.db or uploads/, so live data is never overwritten
    unzip -oq "$ZIP" -d "$APP_DIR"
    sed -i 's/\r$//' deploy/*.sh
  fi

  echo "==> Install, migrate, build"
  npm ci
  npx prisma db push
  npm run build

  echo "==> Restart"
  pm2 reload forcepulse
  pm2 save
  echo "Updated. Logs: pm2 logs forcepulse"
}

main "$@"
exit
