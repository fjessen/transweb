#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 server for Transweb. Run ON THE SERVER as a sudo user:
#   curl -fsSL https://raw.githubusercontent.com/fjessen/transweb/transweb/deploy/server-setup.sh | bash
# or (normally) it is invoked by deploy/gcp/migrate-from-local.sh.
#
# Installs Docker Engine + Compose, adds swap, clones the repo to /opt/transweb/fleetbase and writes
# the root .env with generated database passwords and sslip.io hostnames for this server's IP.
set -euo pipefail

REPO="${REPO:-https://github.com/fjessen/transweb.git}"
BRANCH="${BRANCH:-transweb}"
DIR="${DIR:-/opt/transweb/fleetbase}"
ACME_EMAIL="${ACME_EMAIL:-}"

echo "==> System packages"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ca-certificates curl git unattended-upgrades

if ! command -v docker >/dev/null; then
    echo "==> Docker Engine (official apt repository)"
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
    sudo apt-get update -qq
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker "$USER"
fi

if ! swapon --show | grep -q /swapfile; then
    echo "==> 4 GB swap (the console build is memory hungry)"
    sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile >/dev/null && sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "==> Code: $DIR"
sudo mkdir -p "$(dirname "$DIR")" && sudo chown "$USER": "$(dirname "$DIR")"
if [ ! -d "$DIR/.git" ]; then
    git clone --branch "$BRANCH" "$REPO" "$DIR"
else
    git -C "$DIR" pull --ff-only
fi

cd "$DIR"
if [ ! -f .env ]; then
    echo "==> Writing .env (production settings, generated passwords)"
    IP=$(curl -fsS -H 'Metadata-Flavor: Google' \
        http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip 2>/dev/null \
        || curl -fsS https://api.ipify.org)
    DASHED=${IP//./-}
    gen() { tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32; }
    sed -e "s/^APP_DOMAIN=.*/APP_DOMAIN=app.$DASHED.sslip.io/" \
        -e "s/^API_DOMAIN=.*/API_DOMAIN=api.$DASHED.sslip.io/" \
        -e "s/^ACME_EMAIL=.*/ACME_EMAIL=$ACME_EMAIL/" \
        -e "s/^DB_ROOT_PASSWORD=.*/DB_ROOT_PASSWORD=$(gen)/" \
        -e "s/^DB_PASSWORD=.*/DB_PASSWORD=$(gen)/" \
        deploy/prod.env.example > .env
    chmod 600 .env
fi
grep -E '^(APP_DOMAIN|API_DOMAIN)=' .env

mkdir -p api/storage/app
echo "==> Server ready. api/.env must be copied from your current install (it holds APP_KEY)."
