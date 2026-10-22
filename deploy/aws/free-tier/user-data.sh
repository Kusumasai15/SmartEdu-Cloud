#!/bin/bash
# ==============================================================================
# SmartEdu Cloud / UniFlow LMS — 100% AWS Free Tier Zero-Rupee Bootstrap Script
# Target OS: Ubuntu 24.04 LTS (t3.micro / t2.micro — Free Tier Eligible)
# Cost: ₹0.00 / $0.00 (750 hours/month free, 25 GB storage free)
# ==============================================================================

set -euo pipefail

echo "==> Step 1: Updating system packages..."
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg lsb-release git

echo "==> Step 2: Installing Docker & Docker Compose..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

# Add ubuntu user to docker group
usermod -aG docker ubuntu || true

echo "==> Step 3: Setting up swap space for 1GB RAM Free Tier stability..."
# t3.micro has 1GB RAM; a 2GB swap file ensures smooth build and execution with zero cost
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Step 4: Installing Caddy for automated zero-cost HTTPS SSL..."
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLF 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLF 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update -y
apt-get install -y caddy

echo "==> AWS Free Tier Setup Completed! Ready to run docker compose."
