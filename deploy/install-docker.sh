#!/usr/bin/env bash
# Installs or updates Force Pulse with Docker on any Linux server (Ubuntu, Debian, Kali, CentOS, Fedora...;
# GCP, AWS, DigitalOcean, Hostinger, a home PC). Run from the project folder:
#   sudo bash deploy/install-docker.sh forcepulse.in      with a domain: automatic https
#   sudo bash deploy/install-docker.sh                     no domain yet: plain http on the server's IP
# Run it again after uploading new code to rebuild and restart; the database and photos in ./data are kept.
set -euo pipefail

main() {
  local DOMAIN="${1:-}"
  local APP_DIR
  APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
  cd "$APP_DIR"

  [ "$(id -u)" -eq 0 ] || { echo "Run with sudo:  sudo bash deploy/install-docker.sh $DOMAIN"; exit 1; }
  [ -f .env ] || { echo "Missing .env in $APP_DIR (it comes in forcepulse-full.zip, or copy .env.example and fill it in)."; exit 1; }
  # Files zipped on Windows may have CRLF line endings
  sed -i 's/\r$//' .env deploy/*.sh deploy/Caddyfile

  echo "==> 1/6 Memory check"
  add_swap_if_needed

  echo "==> 2/6 Docker"
  install_docker
  local COMPOSE
  if docker compose version >/dev/null 2>&1; then COMPOSE="docker compose"; else COMPOSE="docker-compose"; fi

  echo "==> 3/6 Settings (.env)"
  if [ -n "$DOMAIN" ]; then
    set_env SITE_ADDRESS "$DOMAIN, www.$DOMAIN"
    set_env APP_URL "https://$DOMAIN"
    set_env COOKIE_SECURE "true"
  else
    local IP
    IP="$(public_ip)"
    set_env SITE_ADDRESS ":80"
    set_env APP_URL "http://$IP"
    set_env COOKIE_SECURE "false"   # sign-in over plain http until a domain is added
  fi

  echo "==> 4/6 Data folder (./data)"
  mkdir -p data/uploads data/backups
  # First install: bring along the database and photos that came in the zip
  if [ ! -f data/forcepulse.db ] && [ -f prisma/dev.db ]; then
    cp prisma/dev.db data/forcepulse.db
    echo "    imported prisma/dev.db"
  fi
  if [ -d uploads ] && [ -z "$(ls -A data/uploads)" ]; then
    cp -r uploads/. data/uploads/
    echo "    imported uploads/"
  fi

  echo "==> 5/6 Build and start (first build takes a few minutes)"
  $COMPOSE up -d --build --remove-orphans
  docker image prune -f >/dev/null

  printf "    waiting for the app"
  local ok=""
  for _ in $(seq 1 60); do
    if $COMPOSE exec -T app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
      ok=1; break
    fi
    printf "."; sleep 3
  done
  echo
  [ -n "$ok" ] || { echo "!! The app did not start. See:  $COMPOSE logs app"; exit 1; }

  echo "==> 6/6 Daily backup at 3:00 AM (kept 14 days in ./data/backups)"
  chmod +x deploy/*.sh
  ( crontab -l 2>/dev/null | grep -v forcepulse-backup || true
    echo "0 3 * * * bash $APP_DIR/deploy/docker-backup.sh >> $APP_DIR/data/backups/backup.log 2>&1 # forcepulse-backup" ) | crontab -

  echo
  echo "Force Pulse is running: $(grep '^APP_URL=' .env | cut -d= -f2- | tr -d '"')"
  [ -n "$DOMAIN" ] && echo "(https starts working once $DOMAIN points to this server's IP: $(public_ip))"
  echo "Logs: $COMPOSE logs -f app    Status: $COMPOSE ps    Backup now: sudo bash deploy/docker-backup.sh"
}

# Sets KEY="value" in .env, replacing an existing line or adding one
set_env() {
  if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=\"$2\"|" .env; else echo "$1=\"$2\"" >> .env; fi
}

public_ip() {
  curl -fs -m 3 -H 'Metadata-Flavor: Google' \
      http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip \
    || curl -fs -m 5 https://api.ipify.org \
    || hostname -I | awk '{print $1}'
}

# Building the app needs ~1.5 GB; small servers get a swap file so the build can finish
add_swap_if_needed() {
  local mem_mb swap_mb
  mem_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
  swap_mb=$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo)
  echo "    RAM ${mem_mb} MB, swap ${swap_mb} MB"
  if [ $((mem_mb + swap_mb)) -lt 3000 ] && [ ! -f /swapfile ]; then
    echo "    adding a 2 GB swap file"
    fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    echo "    already installed: $(docker --version)"
  else
    . /etc/os-release
    if [ "${ID:-}" = "kali" ]; then
      # Docker's install script doesn't know Kali; use Kali's own packages
      apt-get update -y
      apt-get install -y docker.io docker-compose
    else
      curl -fsSL https://get.docker.com | sh
    fi
  fi
  systemctl enable --now docker >/dev/null 2>&1 || true
  command -v crontab >/dev/null 2>&1 || { apt-get install -y cron 2>/dev/null || dnf install -y cronie 2>/dev/null || yum install -y cronie; systemctl enable --now cron crond 2>/dev/null || true; }
}

main "$@"
exit
