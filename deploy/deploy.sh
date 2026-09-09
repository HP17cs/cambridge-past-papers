#!/usr/bin/env bash
set -euo pipefail

# Edit this to your repository URL before running.
REPO_URL="https://github.com/HP17cs/cambridge-past-papers.git"

DOMAIN="${1:?Usage: $0 <domain> [admin-email]}"
ADMIN_EMAIL="${2:-admin@$DOMAIN}"
APP_DIR=/opt/cambridge-past-papers
NODE_MAJOR=22

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y git curl nginx certbot python3-certbot-nginx openssl ca-certificates

if [ ! -x "$(command -v node)" ] || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt "$NODE_MAJOR" ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
fi

if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" pull --ff-only
fi

npm ci --prefix "$APP_DIR/frontend"
npm ci --prefix "$APP_DIR/backend"
npm run build --prefix "$APP_DIR/frontend"

mkdir -p "$APP_DIR/backend/data"
(cd "$APP_DIR/backend" && npm run seed)

if [ -f /etc/cambridge.env ] && grep -q '^JWT_SECRET=' /etc/cambridge.env; then
  JWT_SECRET="$(grep '^JWT_SECRET=' /etc/cambridge.env | cut -d= -f2-)"
else
  JWT_SECRET="$(openssl rand -hex 32)"
fi

umask 077
cat > /etc/cambridge.env <<EOF
NODE_ENV=production
PORT=5000
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
DATABASE_PATH=$APP_DIR/backend/data/cambridge.db
GOOGLE_CLIENT_ID=739014927949-qravqicds39a7972vk67cqvjd8uvv6nj.apps.googleusercontent.com
CORS_ORIGIN=https://$DOMAIN
EOF

cp "$APP_DIR/deploy/cambridge.service" /etc/systemd/system/cambridge.service
systemctl daemon-reload
systemctl enable --now cambridge

sed "s/__DOMAIN__/$DOMAIN/g" "$APP_DIR/deploy/nginx-cambridge.conf" > /etc/nginx/sites-available/cambridge
ln -sf /etc/nginx/sites-available/cambridge /etc/nginx/sites-enabled/cambridge
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$ADMIN_EMAIL" --redirect

mkdir -p "$APP_DIR/backend/data/backups/daily"
cat > /etc/cron.daily/cambridge-backup <<EOF
#!/bin/sh
cp "$APP_DIR/backend/data/cambridge.db" "$APP_DIR/backend/data/backups/daily/cambridge-\$(date +%F).db"
find "$APP_DIR/backend/data/backups/daily" -name 'cambridge-*.db' -mtime +14 -delete
EOF
chmod +x /etc/cron.daily/cambridge-backup

echo ""
echo "Deployed: https://$DOMAIN"
echo "JWT_SECRET: $JWT_SECRET (saved in /etc/cambridge.env)"
echo "Next: add https://$DOMAIN to Google OAuth web client > Authorized JavaScript origins."
echo "Logs: journalctl -u cambridge -f"