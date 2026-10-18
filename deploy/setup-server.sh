#!/usr/bin/env bash
# Setup WITHOUT Docker on any Ubuntu / Debian / Kali server (lightest option for 1 GB machines).
# For the Docker setup use deploy/install-docker.sh instead. Run from the unzipped project folder:
#   bash deploy/setup-server.sh yourdomain.in you@gmail.com     with a domain: https + free SSL certificate
#   bash deploy/setup-server.sh                                  no domain yet: plain http on the server's IP
# Safe to run again (e.g. after adding a domain).
set -euo pipefail

DOMAIN="${1:-}"
CERT_EMAIL="${2:-}"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_USER="$(whoami)"
cd "$APP_DIR"

[ -f .env ] || { echo "Missing .env in $APP_DIR. Upload forcepulse-full.zip (it contains .env)."; exit 1; }
# Files zipped on Windows may have CRLF line endings
sed -i 's/\r$//' .env deploy/*.sh

# Sets KEY="value" in .env, replacing an existing line or adding one
set_env() {
  if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=\"$2\"|" .env; else echo "$1=\"$2\"" >> .env; fi
}

echo "==> 1/7 Swap (lets 'npm run build' finish on a 2 GB machine)"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "==> 2/7 Packages: Node.js 22, nginx, sqlite3, pm2"
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl nginx sqlite3 unzip
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
command -v pm2 >/dev/null || sudo npm install -g pm2

echo "==> 3/7 Settings (.env)"
if [ -n "$DOMAIN" ]; then
  set_env APP_URL "https://$DOMAIN"
  set_env COOKIE_SECURE "true"
else
  IP="$(curl -fs -m 3 -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip     || curl -fs -m 5 https://api.ipify.org || hostname -I | awk '{print $1}')"
  set_env APP_URL "http://$IP"
  set_env COOKIE_SECURE "false"   # sign-in over plain http until a domain + SSL is added
fi
set_env PORT "3000"

echo "==> 4/7 Install and build"
mkdir -p uploads
npm ci
npx prisma db push
npm run build

echo "==> 5/7 Start with pm2 (restarts on crash and on reboot)"
pm2 startOrReload deploy/ecosystem.config.cjs
pm2 save
sudo env PATH="$PATH" pm2 startup systemd -u "$APP_USER" --hp "$HOME" >/dev/null

echo "==> 6/7 nginx"
sed "s|__SERVER_NAME__|${DOMAIN:+$DOMAIN www.$DOMAIN}|; s|server_name ;|server_name _;|" deploy/nginx.conf \
  | sudo tee /etc/nginx/sites-available/forcepulse >/dev/null
sudo ln -sf /etc/nginx/sites-available/forcepulse /etc/nginx/sites-enabled/forcepulse
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

if [ -n "$DOMAIN" ] && [ -n "$CERT_EMAIL" ]; then
  echo "==> SSL certificate for $DOMAIN"
  sudo apt-get install -y certbot python3-certbot-nginx
  # www is optional: try both, fall back to the bare domain
  sudo certbot --nginx --non-interactive --agree-tos --redirect -m "$CERT_EMAIL" -d "$DOMAIN" -d "www.$DOMAIN" \
    || sudo certbot --nginx --non-interactive --agree-tos --redirect -m "$CERT_EMAIL" -d "$DOMAIN" \
    || echo "!! SSL failed. Check that the domain's A record points to this server, then run this script again."
fi

echo "==> 7/7 Daily backup at 3:00 AM server time"
chmod +x deploy/*.sh
( crontab -l 2>/dev/null | grep -v forcepulse-backup || true
  echo "0 3 * * * bash $APP_DIR/deploy/backup.sh >> $HOME/backups/backup.log 2>&1 # forcepulse-backup" ) | crontab -
mkdir -p "$HOME/backups"

echo
echo "Force Pulse is running: $(grep '^APP_URL=' .env | cut -d= -f2- | tr -d '"')"
echo "Logs: pm2 logs forcepulse    Status: pm2 status    Update later: bash deploy/update.sh"
