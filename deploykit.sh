#!/bin/bash

# ============================
# Script Deploy API SaaS ke Dokku (sederhana)
# ============================

# ===== ARGUMENTS =====
APP_NAME="$1"         # Nama app di Dokku
GITHUB_REPO="$2"      # Repo GitHub
ENV_VARS_RAW="$3"     # Optional, ENV vars dipisah koma: NODE_ENV=production,PORT=3000

# ===== VALIDASI =====
if [ -z "$APP_NAME" ] || [ -z "$GITHUB_REPO" ]; then
    echo "Usage: $0 <APP_NAME> <GITHUB_REPO> [ENV_VARS]"
    echo "Example: $0 myapp https://github.com/user/repo.git NODE_ENV=production,PORT=3000"
    exit 1
fi

# ===== PARSE ENV_VARS =====
IFS=',' read -r -a ENV_VARS <<< "$ENV_VARS_RAW"

# ===== 1. Install Dokku LetsEncrypt Plugin (jika belum) =====
dokku plugin:list | grep letsencrypt >/dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "[INFO] Installing Dokku LetsEncrypt plugin..."
  dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git
fi

# ===== 2. Create Dokku App =====
dokku apps:create $APP_NAME || echo "[INFO] App $APP_NAME sudah ada."

# ===== 3. Set Environment Variables =====
for VAR in "${ENV_VARS[@]}"; do
  dokku config:set --no-restart $APP_NAME $VAR
done

# ===== 4. Auto Domain =====
SERVER_HOSTNAME=$(hostname -f)
AUTO_DOMAIN="${APP_NAME}.${SERVER_HOSTNAME}"
dokku domains:add $APP_NAME $AUTO_DOMAIN

# ===== 5. Clone GitHub Repo & Deploy =====
TMP_DIR=$(mktemp -d)
git clone $GITHUB_REPO $TMP_DIR
cd $TMP_DIR
git init
git remote add dokku dokku@localhost:$APP_NAME
git add .
git commit -m "Initial deploy"
git push dokku main

# ===== 6. Enable LetsEncrypt =====
dokku letsencrypt:enable $APP_NAME
dokku letsencrypt:cron-job --add

# ===== 7. Cleanup =====
cd ~
rm -rf $TMP_DIR

# ===== 8. Status =====
dokku ps:report $APP_NAME
dokku letsencrypt:info $APP_NAME

echo "[DONE] Deployment finished. App $APP_NAME is live at https://$AUTO_DOMAIN"
