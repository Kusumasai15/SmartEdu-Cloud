#!/usr/bin/env bash
set -e

echo "=========================================="
echo "  Deploying SmartEdu Cloud on AWS EC2     "
echo "=========================================="

# Navigate to script repo root
cd "$(dirname "$0")/../../.."

echo "[1/4] Pulling latest updates from GitHub..."
git pull origin main

echo "[2/4] Configuring Caddy reverse proxy on port 80..."
if [ -f /etc/caddy/Caddyfile ]; then
    sudo cp deploy/aws/free-tier/Caddyfile /etc/caddy/Caddyfile
    sudo systemctl reload caddy || sudo systemctl restart caddy
elif command -v caddy &> /dev/null; then
    sudo cp deploy/aws/free-tier/Caddyfile /etc/caddy/Caddyfile
    sudo systemctl restart caddy
fi

echo "[3/4] Rebuilding and launching Docker containers..."
docker compose down 2>/dev/null || true
docker compose up -d --build

echo "[4/4] Verifying running services..."
docker compose ps

echo "=========================================="
echo "  Deployment Complete!                     "
echo "  Access URL: http://3.109.59.82           "
echo "=========================================="
