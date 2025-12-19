# BoardMeeting Deployment Guide

Deploy BoardMeeting to your Ubuntu/Debian server.

## Prerequisites

- Ubuntu 20.04/22.04/24.04 or Debian server
- Root SSH access
- Domain pointing to your server (chairboard.me → 142.93.223.230)
- Clerk account with API keys

## Quick Deployment

### Step 1: Upload deploy scripts to server

From your local machine:
```bash
scp -r deploy/* root@142.93.223.230:/root/
```

### Step 2: SSH into server

```bash
ssh root@142.93.223.230
```

### Step 3: Run server setup

```bash
chmod +x /root/01-server-setup.sh
/root/01-server-setup.sh
```

**IMPORTANT:** Save the database credentials shown at the end!

### Step 4: Clone repository and create environment files

```bash
cd /var/www/boardmeeting
git clone https://github.com/CoddictLebanon/boardroom.git .
```

Create backend environment file:
```bash
nano /var/www/boardmeeting/apps/api/.env
```

Paste and edit (use your database password from Step 3):
```
DATABASE_URL="postgresql://boardmeeting:YOUR_DB_PASSWORD@localhost:5432/boardmeeting"
CLERK_PUBLISHABLE_KEY="pk_live_xxxxx"
CLERK_SECRET_KEY="sk_live_xxxxx"
CLERK_WEBHOOK_SECRET="whsec_xxxxx"
NODE_ENV="production"
PORT=3001
FRONTEND_URL="https://chairboard.me"
```

Create frontend environment file:
```bash
nano /var/www/boardmeeting/apps/web/.env.local
```

Paste and edit:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_xxxxx"
CLERK_SECRET_KEY="sk_live_xxxxx"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/companies"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/companies"
NEXT_PUBLIC_API_URL="https://chairboard.me/api/v1"
```

### Step 5: Run deployment

```bash
chmod +x /root/02-deploy.sh
/root/02-deploy.sh
```

### Step 6: Configure Nginx

```bash
cp /var/www/boardmeeting/deploy/nginx.conf /etc/nginx/sites-available/chairboard.me
ln -s /etc/nginx/sites-available/chairboard.me /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # Remove default site
nginx -t
systemctl reload nginx
```

### Step 7: Get SSL Certificate

```bash
certbot --nginx -d chairboard.me -d www.chairboard.me
```

Follow the prompts to complete SSL setup.

### Step 8: Update Clerk Webhook

In your Clerk Dashboard:
1. Go to Webhooks
2. Add endpoint: `https://chairboard.me/api/v1/webhooks/clerk`
3. Select events: `user.created`, `user.updated`, `user.deleted`
4. Copy the signing secret to your `.env` file as `CLERK_WEBHOOK_SECRET`

## Useful Commands

### View logs
```bash
pm2 logs boardmeeting-api
pm2 logs boardmeeting-web
```

### Restart applications
```bash
pm2 restart all
```

### Check status
```bash
pm2 status
```

### Update deployment
```bash
cd /var/www/boardmeeting
git pull origin master
/root/02-deploy.sh
```

## Troubleshooting

### Check if services are running
```bash
pm2 list
systemctl status nginx
systemctl status postgresql
```

### Check Nginx error logs
```bash
tail -f /var/log/nginx/error.log
```

### Check application logs
```bash
pm2 logs --lines 100
```

### Database connection issues
```bash
sudo -u postgres psql -c "\l"  # List databases
sudo -u postgres psql -c "\du"  # List users
```
