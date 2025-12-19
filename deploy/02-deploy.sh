#!/bin/bash
# Deployment Script for BoardMeeting App
# Run this on the server after 01-server-setup.sh

set -e

APP_DIR="/var/www/boardmeeting"
REPO_URL="https://github.com/CoddictLebanon/boardroom.git"
DOMAIN="chairboard.me"

echo "========================================="
echo "BoardMeeting Deployment"
echo "========================================="

# Clone or pull repository
echo "[1/6] Cloning/updating repository..."
if [ -d "$APP_DIR/.git" ]; then
    cd $APP_DIR
    git pull origin master
else
    rm -rf $APP_DIR/*
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# Check if .env files exist
if [ ! -f "$APP_DIR/apps/api/.env" ]; then
    echo ""
    echo "ERROR: Backend .env file not found!"
    echo "Please create $APP_DIR/apps/api/.env with your configuration"
    echo "See deploy/env.api.example for template"
    exit 1
fi

if [ ! -f "$APP_DIR/apps/web/.env.local" ]; then
    echo ""
    echo "ERROR: Frontend .env.local file not found!"
    echo "Please create $APP_DIR/apps/web/.env.local with your configuration"
    echo "See deploy/env.web.example for template"
    exit 1
fi

# Install backend dependencies and build
echo "[2/6] Installing backend dependencies..."
cd $APP_DIR/apps/api
npm install

echo "[3/6] Running database migrations..."
npx prisma generate
npx prisma migrate deploy

echo "[4/6] Building backend..."
npm run build

# Install frontend dependencies and build
echo "[5/6] Installing frontend dependencies..."
cd $APP_DIR/apps/web
npm install

echo "[6/6] Building frontend..."
npm run build

# Start/restart with PM2
echo "Starting applications with PM2..."
cd $APP_DIR

# Stop existing processes if running
pm2 delete boardmeeting-api 2>/dev/null || true
pm2 delete boardmeeting-web 2>/dev/null || true

# Start backend API
cd $APP_DIR/apps/api
pm2 start npm --name "boardmeeting-api" -- run start:prod

# Start frontend (Next.js)
cd $APP_DIR/apps/web
pm2 start npm --name "boardmeeting-web" -- run start

# Save PM2 configuration
pm2 save
pm2 startup

echo ""
echo "========================================="
echo "Deployment complete!"
echo "========================================="
echo ""
echo "Applications running:"
pm2 list
echo ""
echo "Next steps:"
echo "1. Configure Nginx: sudo cp $APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/$DOMAIN"
echo "2. Enable site: sudo ln -s /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/"
echo "3. Test Nginx: sudo nginx -t"
echo "4. Reload Nginx: sudo systemctl reload nginx"
echo "5. Get SSL: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
