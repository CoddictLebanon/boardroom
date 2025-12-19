#!/bin/bash
# Server Setup Script for BoardMeeting App
# Run this on a fresh Ubuntu/Debian server as root

set -e

echo "========================================="
echo "BoardMeeting Server Setup"
echo "========================================="

# Update system
echo "[1/7] Updating system packages..."
apt update && apt upgrade -y

# Install essential tools
echo "[2/7] Installing essential tools..."
apt install -y curl wget git build-essential

# Install Node.js 20.x LTS
echo "[3/7] Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Install PM2 globally
echo "[4/7] Installing PM2..."
npm install -g pm2

# Install PostgreSQL
echo "[5/7] Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Create database and user
echo "[6/7] Setting up PostgreSQL database..."
DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
sudo -u postgres psql <<EOF
CREATE USER boardmeeting WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE boardmeeting OWNER boardmeeting;
GRANT ALL PRIVILEGES ON DATABASE boardmeeting TO boardmeeting;
EOF

echo ""
echo "========================================="
echo "DATABASE CREDENTIALS (SAVE THESE!):"
echo "========================================="
echo "DB_HOST=localhost"
echo "DB_PORT=5432"
echo "DB_NAME=boardmeeting"
echo "DB_USER=boardmeeting"
echo "DB_PASSWORD=${DB_PASSWORD}"
echo "DATABASE_URL=postgresql://boardmeeting:${DB_PASSWORD}@localhost:5432/boardmeeting"
echo "========================================="
echo ""

# Install Nginx
echo "[7/7] Installing Nginx..."
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# Install Certbot for SSL
echo "Installing Certbot for SSL..."
apt install -y certbot python3-certbot-nginx

# Create app directory
mkdir -p /var/www/boardmeeting
chown -R $USER:$USER /var/www/boardmeeting

echo ""
echo "========================================="
echo "Server setup complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Save the database credentials above"
echo "2. Run: ./02-deploy.sh"
echo ""
