#!/usr/bin/env bash
# Creates the Transweb server on Google Cloud (Compute Engine). Run from your PC (Git Bash) after
# `gcloud auth login`. Safe to re-run: existing resources are kept.
#
#   PROJECT_ID=transweb-prod deploy/gcp/create-vm.sh
#
# Creates: static external IP, firewall rule for HTTP/HTTPS, an Ubuntu 24.04 VM, a Cloud Storage
# bucket for off-server backups. This starts billing on the project.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?set PROJECT_ID (the Google Cloud project id)}"
REGION="${REGION:-europe-west1}"            # Belgium
ZONE="${ZONE:-${REGION}-b}"
VM_NAME="${VM_NAME:-transweb-1}"
MACHINE_TYPE="${MACHINE_TYPE:-e2-standard-2}" # 2 vCPU, 8 GB RAM (4 GB is too tight for the console build)
DISK_SIZE="${DISK_SIZE:-60GB}"
BUCKET="${BUCKET:-${PROJECT_ID}-transweb-backups}"

g() { gcloud --project "$PROJECT_ID" "$@"; }

echo "==> Enabling Compute Engine and Cloud Storage APIs"
g services enable compute.googleapis.com storage.googleapis.com

echo "==> Static IP"
if ! g compute addresses describe "${VM_NAME}-ip" --region "$REGION" >/dev/null 2>&1; then
    g compute addresses create "${VM_NAME}-ip" --region "$REGION"
fi
IP=$(g compute addresses describe "${VM_NAME}-ip" --region "$REGION" --format='value(address)')
echo "    $IP"

echo "==> Firewall: allow 80/443 to VMs tagged transweb-web"
if ! g compute firewall-rules describe transweb-allow-web >/dev/null 2>&1; then
    g compute firewall-rules create transweb-allow-web \
        --network default --direction INGRESS --action ALLOW \
        --rules tcp:80,tcp:443,udp:443 --target-tags transweb-web --source-ranges 0.0.0.0/0
fi

echo "==> VM $VM_NAME ($MACHINE_TYPE, $ZONE)"
if ! g compute instances describe "$VM_NAME" --zone "$ZONE" >/dev/null 2>&1; then
    g compute instances create "$VM_NAME" \
        --zone "$ZONE" \
        --machine-type "$MACHINE_TYPE" \
        --image-family ubuntu-2404-lts-amd64 --image-project ubuntu-os-cloud \
        --boot-disk-size "$DISK_SIZE" --boot-disk-type pd-balanced \
        --address "$IP" \
        --tags transweb-web \
        --scopes cloud-platform \
        --metadata enable-oslogin=TRUE \
        --deletion-protection
fi

echo "==> Backup bucket gs://$BUCKET"
if ! g storage buckets describe "gs://$BUCKET" >/dev/null 2>&1; then
    g storage buckets create "gs://$BUCKET" --location "$REGION" --uniform-bucket-level-access
    # keep 30 days of backups
    printf '{"rule":[{"action":{"type":"Delete"},"condition":{"age":30}}]}' > /tmp/transweb-lifecycle.json
    g storage buckets update "gs://$BUCKET" --lifecycle-file /tmp/transweb-lifecycle.json
fi

DASHED=${IP//./-}
cat <<EOF

Done.
  VM:       $VM_NAME  ($ZONE)
  IP:       $IP
  Console:  https://app.$DASHED.sslip.io
  API:      https://api.$DASHED.sslip.io
  Backups:  gs://$BUCKET

Next: PROJECT_ID=$PROJECT_ID ZONE=$ZONE deploy/gcp/migrate-from-local.sh
EOF
