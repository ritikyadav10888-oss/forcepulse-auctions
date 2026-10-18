# Deploying Force Pulse

Force Pulse runs on **any Linux server**: Google Cloud, AWS, DigitalOcean, Hostinger, Azure, a home PC
(Ubuntu, Debian, Kali, CentOS, Fedora...). Pick one of two ways:

| | **A. Docker** (recommended) | **B. Without Docker** |
|---|---|---|
| Script | `deploy/install-docker.sh` | `deploy/setup-server.sh` |
| Works on | Any Linux with internet | Ubuntu / Debian / Kali |
| https | Automatic (Caddy) | nginx + certbot |
| Best for | Everything; same setup on every server | Squeezing into the smallest 1 GB machines |

## Minimum requirements

| | Minimum | Recommended |
|---|---|---|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB (the script adds 2 GB swap for the build) | 2 GB, or 4 GB for big live auctions |
| Disk | 10 GB | 20 GB |
| OS | 64-bit Linux | Ubuntu 24.04 LTS |

Measured in Docker: the running app uses about **60–120 MB of RAM** and stays healthy with a 512 MB limit.
Only the one-time build needs ~1.5 GB, which swap covers on small machines (it is just slower).

Examples: GCP e2-small, AWS t3.small, DigitalOcean $6 droplet, Hostinger KVM 1.
Open ports **80** and **443** in the provider's firewall.

## A. Docker setup (recommended)

**1. Pack the project** (laptop, PowerShell, in the project folder)

```powershell
powershell -ExecutionPolicy Bypass -File deploy\make-zip.ps1
```

`forcepulse-full.zip` appears on the Desktop: code, `.env`, database and photos. It contains your passwords,
so upload it only to your own server and delete it afterwards.

**2. Upload it to the server** (any of these)

- GCP: VM instances > **SSH** > ⚙️ > **Upload file**
- Any server: `scp forcepulse-full.zip user@SERVER_IP:~`
- Or WinSCP / FileZilla (SFTP)

**3. Point your domain at the server**: an **A record** for `@` and `www` → the server's IP.

**4. Install** (on the server)

```bash
unzip -q forcepulse-full.zip -d forcepulse && cd forcepulse
sed -i 's/\r$//' deploy/*.sh
sudo bash deploy/install-docker.sh forcepulse.in
```

Use your own domain. No domain yet? Run `sudo bash deploy/install-docker.sh` with nothing after it; the site
works on `http://SERVER_IP`, and running it again with a domain later switches on https.

The script installs Docker if needed, adds swap on small machines, imports your database and photos into
`./data`, builds, starts the app plus Caddy (automatic https), waits until it is healthy and sets up a
daily backup.

**Update later**

```powershell
powershell -ExecutionPolicy Bypass -File deploy\make-zip.ps1 -Update
```

Upload `forcepulse-update.zip`, then on the server:

```bash
cd ~/forcepulse && unzip -oq ~/forcepulse-update.zip && sudo bash deploy/install-docker.sh forcepulse.in
```

The update zip has no `.env`, database or photos, so live accounts and auctions are kept.

**Everyday commands** (in `~/forcepulse`)

| | |
|---|---|
| `sudo docker compose ps` | Is it running and healthy? |
| `sudo docker compose logs -f app` | Live logs (errors, password-reset messages) |
| `sudo docker compose restart app` | Restart, e.g. after editing `.env` |
| `sudo bash deploy/docker-backup.sh` | Back up now (to `./data/backups`) |
| `sudo docker compose down` / `up -d` | Stop / start everything |

Everything that matters is in **`./data`** (`forcepulse.db`, `uploads/`, `backups/`) and `.env`.
Copying those to a new server and running the install script moves the whole site.

**Restore a backup**

```bash
sudo docker compose stop app
sudo cp data/backups/db-YYYY-MM-DD-HHMM.db data/forcepulse.db
sudo tar -xzf data/backups/uploads-YYYY-MM-DD-HHMM.tar.gz -C data
sudo docker compose start app
```

## B. Without Docker

On Ubuntu / Debian / Kali, after steps 1–3 above:

```bash
unzip -q forcepulse-full.zip -d forcepulse && cd forcepulse
sed -i 's/\r$//' deploy/*.sh
bash deploy/setup-server.sh forcepulse.in you@gmail.com
```

It installs Node 22, nginx, pm2 and an SSL certificate, then builds and starts the app. Updates:
`bash deploy/update.sh ~/forcepulse-update.zip`. Commands: `pm2 status`, `pm2 logs forcepulse`,
`pm2 restart forcepulse`, `bash deploy/backup.sh` (backups in `~/backups`).

## Google Cloud shortcut

`deploy/gcp-create-vm.sh` creates a ready VM in Mumbai (static IP, firewall, daily disk snapshots).
Run it in Google Cloud Shell: `bash gcp-create-vm.sh` (or `MACHINE=e2-medium bash gcp-create-vm.sh`),
then continue with step 2.

## Settings in `.env`

| Setting | Meaning |
|---|---|
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Force Pulse admin account, created on first start |
| `AUTH_SECRET` | Signs password-reset links; keep it secret and unchanged |
| `SMTP_*`, `MAIL_FROM` | Email for forgot-password |
| `APP_URL`, `SITE_ADDRESS`, `COOKIE_SECURE` | Set by the install scripts from the domain you give |
| `BACKUP_BUCKET` | Optional, without-Docker setup on GCP: also copy backups to Cloud Storage |

## Files in this folder

| File | Purpose |
|---|---|
| `make-zip.ps1` | Packs the project on Windows (full or `-Update`) |
| `install-docker.sh`, `docker-backup.sh`, `docker-entrypoint.sh`, `Caddyfile` | Docker setup (with `Dockerfile` and `docker-compose.yml` in the project root) |
| `setup-server.sh`, `update.sh`, `backup.sh`, `nginx.conf`, `ecosystem.config.cjs` | Setup without Docker |
| `gcp-create-vm.sh` | Creates the Google Cloud VM |
