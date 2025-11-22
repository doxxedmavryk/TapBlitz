# TapBlitz Deployment Guide

Complete step-by-step guide to deploy TapBlitz to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Smart Contract Deployment](#smart-contract-deployment)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Post-Deployment Setup](#post-deployment-setup)
6. [Monitoring & Maintenance](#monitoring--maintenance)

## Prerequisites

### Required Tools

```bash
# SmartPy CLI
curl -s https://smartpy.io/cli/install.sh | bash

# Mavryk CLI
wget https://gitlab.com/tezos/tezos/-/releases/download/mavryk-client
chmod +x mavryk-client
sudo mv mavryk-client /usr/local/bin/

# Python 3.10+
python3 --version

# Node.js 20+
node --version

# Docker (optional, for Redis)
docker --version
```

### Wallet Setup

1. **Create a new wallet for deployment** (do NOT use personal wallet):

```bash
mavkit-client gen keys deployer
mavkit-client show address deployer
```

2. **Fund the wallet**:
   - Ghostnet: Get free XTZ from [faucet](https://faucet.mavryk.network)
   - Mainnet: Transfer at least 100 XTZ for origination fees

3. **Export private key**:

```bash
mavkit-client show address deployer -S
# Save the edsk... key securely
```

## Smart Contract Deployment

### Step 1: Configure Environment

```bash
cd scripts

# Copy and edit environment variables
cat > .env << EOF
NETWORK=ghostnet
ADMIN_KEY=edsk...your_private_key...
MAVRYK_RPC_URL=https://rpc.ghostnet.mavryk.network
EOF
```

### Step 2: Install Python Dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Deploy Contracts

```bash
# Set environment variables
export $(cat .env | xargs)

# Run deployment script
python deploy_contracts.py
```

**Expected Output:**

```
############################################################
# TapBlitz Contract Deployment
# Network: ghostnet
# RPC: https://rpc.ghostnet.mavryk.network
############################################################

📡 Step 1: Deploying Mock Oracle...
============================================================
Deploying MockOracle...
============================================================
Compiling contracts/oracle/harbinger_oracle.py...
Originating contract...
✅ Operation injected: op...
⏳ Waiting for confirmation...
✅ MockOracle deployed at: KT1abc...

🪙 Step 2: Deploying EUPH Token...
...
✅ EUPH Token deployed at: KT1def...

📈 Step 3: Deploying Perpetuals Contract...
...
✅ Perpetuals deployed at: KT1ghi...

🎯 Step 4: Deploying Binary Options Contract...
...
✅ Binary Options deployed at: KT1jkl...

============================================================
DEPLOYMENT SUMMARY
============================================================
oracle               KT1abc...
euphToken            KT1def...
perpetuals           KT1ghi...
options              KT1jkl...
============================================================

✅ Deployment addresses saved to: deployments/ghostnet.json
✅ Environment file saved to: deployments/.env.ghostnet

🎉 Deployment complete!
```

### Step 4: Verify Deployment

```bash
# Test contracts
python test_contracts.py
```

### Step 5: Initialize Contracts

```bash
# Update oracle with initial prices
mavkit-client \
  --endpoint https://rpc.ghostnet.mavryk.network \
  call KT1abc... \
  from deployer \
  --entrypoint update_price \
  --arg '(Pair "BTC-USD" 45000000000)'

# Create first weekly options series
mavkit-client \
  call KT1jkl... \
  from deployer \
  --entrypoint create_weekly_series \
  --arg 0
```

## Backend Deployment

### Step 1: Prepare Server

We'll use AWS EC2, but any VPS works (DigitalOcean, Linode, etc.).

```bash
# SSH into server
ssh ubuntu@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Redis
sudo apt install -y redis-server
sudo systemctl start redis
sudo systemctl enable redis

# Install PM2 for process management
sudo npm install -g pm2
```

### Step 2: Deploy Backend Code

```bash
# Clone repository
git clone https://github.com/doxxedmavryk/TapBlitz.git
cd TapBlitz/backend

# Install dependencies
npm install

# Copy environment file from contract deployment
cp ../deployments/.env.ghostnet .env

# Edit .env to add additional config
nano .env
```

Add:

```env
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://tapblitz.finance
REDIS_URL=redis://localhost:6379
```

### Step 3: Build and Start

```bash
# Build TypeScript
npm run build

# Start with PM2
pm2 start dist/index.js --name tapblitz-backend

# Save PM2 configuration
pm2 save
pm2 startup
```

### Step 4: Configure Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create configuration
sudo nano /etc/nginx/sites-available/tapblitz-api
```

Add:

```nginx
server {
    listen 80;
    server_name api.tapblitz.finance;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/tapblitz-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.tapblitz.finance
```

## Frontend Deployment

### Option A: Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from frontend directory
cd frontend
vercel --prod
```

**Configuration in Vercel Dashboard:**

- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables:
  - `VITE_API_URL`: `https://api.tapblitz.finance`
  - `VITE_NETWORK`: `ghostnet`
  - `VITE_RPC_URL`: `https://rpc.ghostnet.mavryk.network`

### Option B: Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd frontend
netlify deploy --prod
```

### Option C: Self-Host with Nginx

```bash
# Build frontend
cd frontend
npm run build

# Copy to server
scp -r dist/* ubuntu@your-server:/var/www/tapblitz

# Configure Nginx
sudo nano /etc/nginx/sites-available/tapblitz
```

Add:

```nginx
server {
    listen 80;
    server_name tapblitz.finance www.tapblitz.finance;
    root /var/www/tapblitz;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable and configure SSL
sudo ln -s /etc/nginx/sites-available/tapblitz /etc/nginx/sites-enabled/
sudo certbot --nginx -d tapblitz.finance -d www.tapblitz.finance
```

## Post-Deployment Setup

### 1. Update Frontend Config

Edit `frontend/src/store/useStore.ts` with deployed contract addresses:

```typescript
config: {
  networkType: 'ghostnet',
  rpcUrl: 'https://rpc.ghostnet.mavryk.network',
  contracts: {
    perpetuals: 'KT1ghi...',
    options: 'KT1jkl...',
    euphToken: 'KT1def...',
    oracle: 'KT1abc...',
  },
}
```

Redeploy frontend after updating.

### 2. Start Oracle Price Updates

Set up a cron job to update prices regularly:

```bash
# Create price update script
cat > ~/update_prices.sh << 'EOF'
#!/bin/bash
# Fetch BTC price from CoinGecko
BTC_PRICE=$(curl -s 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd' | jq -r '.bitcoin.usd')
BTC_SCALED=$(echo "$BTC_PRICE * 1000000" | bc | cut -d. -f1)

# Update oracle
mavkit-client call KT1abc... from deployer \
  --entrypoint update_price \
  --arg "(Pair \"BTC-USD\" $BTC_SCALED)"
EOF

chmod +x ~/update_prices.sh

# Add to crontab (every 5 minutes)
crontab -e
# Add line:
*/5 * * * * ~/update_prices.sh >> ~/price_updates.log 2>&1
```

### 3. Configure Weekly Options Series

```bash
# Create weekly series creation script
cat > ~/create_weekly_series.sh << 'EOF'
#!/bin/bash
mavkit-client call KT1jkl... from deployer \
  --entrypoint create_weekly_series \
  --arg 0
EOF

chmod +x ~/create_weekly_series.sh

# Add to crontab (every Monday at 00:00)
crontab -e
# Add line:
0 0 * * 1 ~/create_weekly_series.sh >> ~/series_creation.log 2>&1
```

### 4. Set Up Monitoring

```bash
# Install monitoring stack
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v /path/to/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

docker run -d \
  --name grafana \
  -p 3000:3000 \
  grafana/grafana
```

### 5. Database Backup

```bash
# Set up Redis persistence
sudo nano /etc/redis/redis.conf
# Enable:
# save 900 1
# save 300 10
# save 60 10000

sudo systemctl restart redis

# Create backup script
cat > ~/backup_redis.sh << 'EOF'
#!/bin/bash
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb /backups/redis-$(date +%Y%m%d).rdb
EOF

chmod +x ~/backup_redis.sh

# Daily backup at 02:00
crontab -e
# Add:
0 2 * * * ~/backup_redis.sh
```

## Monitoring & Maintenance

### Health Checks

```bash
# Check backend health
curl https://api.tapblitz.finance/health

# Check contract storage
mavkit-client get contract storage for KT1ghi...

# Check Redis
redis-cli ping
```

### Logs

```bash
# Backend logs
pm2 logs tapblitz-backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
journalctl -u redis -f
```

### Updates

```bash
# Update backend
cd ~/TapBlitz/backend
git pull
npm install
npm run build
pm2 restart tapblitz-backend

# Update frontend
cd ~/TapBlitz/frontend
git pull
npm install
npm run build
# Re-deploy to Vercel/Netlify or copy to /var/www/tapblitz
```

## Mainnet Migration

When ready to deploy to mainnet:

1. **Test thoroughly on Ghostnet** for at least 2 weeks
2. **Audit contracts** with professional security firm
3. **Set up multi-sig admin** for mainnet contracts
4. **Deploy with conservative parameters**:
   - Lower max leverage initially (10x)
   - Higher minimum collateral ($100)
   - Gradual rollout to beta testers
5. **Monitor closely** for first 48 hours
6. **Have emergency pause plan** ready

```bash
# Deploy to mainnet
export NETWORK=mainnet
export ADMIN_KEY=edsk...mainnet_key...
python deploy_contracts.py
```

## Troubleshooting

### Contract Deployment Fails

```bash
# Check balance
mavkit-client get balance for deployer

# Check RPC connection
curl https://rpc.ghostnet.mavryk.network/chains/main/blocks/head

# Increase gas limit
# Edit deploy_contracts.py, add:
# operation.autofill(gas_limit=200000)
```

### Backend Won't Start

```bash
# Check logs
pm2 logs tapblitz-backend --lines 100

# Check Redis connection
redis-cli ping

# Check ports
sudo netstat -tulpn | grep 4000
```

### Frontend Shows "Contract Not Found"

- Verify contract addresses in config
- Check network (Ghostnet vs Mainnet)
- Clear browser cache
- Check browser console for errors

---

**Need help?** Join our [Discord](https://discord.gg/tapblitz) or email support@tapblitz.finance
