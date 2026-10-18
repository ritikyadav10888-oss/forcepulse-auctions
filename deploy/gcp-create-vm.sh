#!/usr/bin/env bash
# Creates the Force Pulse server on Google Cloud. Run it in Google Cloud Shell (the >_ button in the console):
#   bash gcp-create-vm.sh
# Optional settings: ZONE=asia-south1-a  MACHINE=e2-small  NAME=forcepulse
set -euo pipefail

NAME="${NAME:-forcepulse}"
ZONE="${ZONE:-asia-south1-a}"     # Mumbai
REGION="${ZONE%-*}"
MACHINE="${MACHINE:-e2-small}"    # 2 vCPU (shared), 2 GB RAM. Use e2-medium (4 GB) for big auctions.

PROJECT="$(gcloud config get-value project 2>/dev/null)"
[ -n "$PROJECT" ] || { echo "Pick a project first: gcloud config set project <PROJECT_ID>"; exit 1; }
echo "==> Project $PROJECT, zone $ZONE, machine $MACHINE"

gcloud services enable compute.googleapis.com

# Static IP, so the address never changes (point your domain at it)
if ! gcloud compute addresses describe "$NAME-ip" --region="$REGION" >/dev/null 2>&1; then
  gcloud compute addresses create "$NAME-ip" --region="$REGION"
fi
IP="$(gcloud compute addresses describe "$NAME-ip" --region="$REGION" --format='value(address)')"

# Open ports 80 and 443 for the website
if ! gcloud compute firewall-rules describe "$NAME-web" >/dev/null 2>&1; then
  gcloud compute firewall-rules create "$NAME-web" --allow=tcp:80,tcp:443 --target-tags="$NAME-web"
fi

# Ubuntu 24.04 VM. storage-rw lets the daily backup copy to a Cloud Storage bucket.
if ! gcloud compute instances describe "$NAME" --zone="$ZONE" >/dev/null 2>&1; then
  gcloud compute instances create "$NAME" \
    --zone="$ZONE" \
    --machine-type="$MACHINE" \
    --image-family=ubuntu-2404-lts-amd64 \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=20GB \
    --boot-disk-type=pd-balanced \
    --address="$IP" \
    --tags="$NAME-web" \
    --scopes=logging-write,monitoring-write,storage-rw
fi

# Daily disk snapshot (database + photos), kept 7 days. 21:00 UTC = 2:30 AM IST.
if ! gcloud compute resource-policies describe "$NAME-daily" --region="$REGION" >/dev/null 2>&1; then
  gcloud compute resource-policies create snapshot-schedule "$NAME-daily" \
    --region="$REGION" --max-retention-days=7 --daily-schedule --start-time=21:00
fi
gcloud compute disks add-resource-policies "$NAME" --zone="$ZONE" --resource-policies="$NAME-daily" 2>/dev/null || true

cat <<EOF

==> Done. Server "$NAME" is ready at $IP

Next:
  1. Domain DNS: add an A record  ->  $IP   (for both yourdomain.in and www)
  2. Upload forcepulse-full.zip:  Compute Engine > VM instances > SSH > Upload file
  3. On the VM:
       unzip -q forcepulse-full.zip -d forcepulse && cd forcepulse
       bash deploy/setup-server.sh yourdomain.in you@gmail.com
EOF
