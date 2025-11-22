# TapBlitz ⚡

> **One-Tap Derivatives Trading on Mavryk Blockchain**

A gamified, web-browser-first derivatives trading platform that makes crypto options and perpetuals trading extremely simple and addictive through one-tap directional bets directly on an interactive price chart.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Mavryk](https://img.shields.io/badge/Blockchain-Mavryk-blue)](https://mavryk.network)
[![SmartPy](https://img.shields.io/badge/Contracts-SmartPy-green)](https://smartpy.io)

## 🎯 Features

### Trading

- **One-Tap Trading**: Click anywhere on the live price chart to instantly open a position
- **BTC & ETH Perpetuals**: Trade perpetual futures with up to 50x leverage
- **Binary Options**: Weekly expiry options with simple UP/DOWN predictions
- **Risk Profiles**:
  - 🟢 **Casual** (5x leverage) - For steady gains
  - 🟠 **Degenerate** (20x leverage) - For the bold
  - 🟣 **Whale** (10x leverage) - Balanced approach

### Gamification

- 🏆 **Global Leaderboard** - Compete for the top spot
- 🏅 **Achievements** - Unlock badges and rewards
- 🔥 **Daily Streaks** - Login daily for increasing rewards
- 🎁 **Daily Rewards** - Earn EUPH tokens every day
- 🎨 **Confetti & Sounds** - Celebrate your wins
- 📊 **Stats Dashboard** - Track your P&L, win rate, and more

### Platform Features

- ⚡ **Instant Settlement** - Blockchain-powered instant execution
- 💰 **EUPH Token** - Native platform token for fee discounts and governance
- 🔐 **Secure** - Multi-sig admin, emergency pause, formal verification
- 📱 **Mobile-First** - Responsive design for trading on the go
- 🌍 **Compliant** - Geo-blocking for restricted jurisdictions

## 🏗️ Architecture

```
Frontend (React + TypeScript + Tailwind)
    ↓
Backend API (Node.js + Express)
    ↓
Mavryk Blockchain (SmartPy Contracts)
    ↓
Harbinger Oracle (Price Feeds)
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed system design.

## 📦 Tech Stack

### Smart Contracts
- **Language**: SmartPy (Python-like syntax → Michelson)
- **Blockchain**: Mavryk (Tezos-based)
- **Token Standard**: FA2 (equivalent to ERC-20/721)
- **Oracle**: Harbinger v2

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State**: Zustand
- **Charts**: Lightweight Charts
- **Animations**: Framer Motion
- **Wallet**: Beacon SDK (@airgap/beacon-sdk)

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express
- **Database**: PostgreSQL (optional)
- **Cache**: Redis
- **Blockchain SDK**: Taquito

## 🚀 Quick Start

### Prerequisites

```bash
# Node.js 20+
node --version

# Python 3.10+
python3 --version

# SmartPy CLI
smartpy --version

# Mavryk CLI (optional)
mavkit-client --version
```

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/TapBlitz.git
cd TapBlitz

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install

# Install Python dependencies for deployment
cd ../scripts
pip install -r requirements.txt
```

### Local Development

#### 1. Start Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

The backend will start on `http://localhost:4000`

#### 2. Start Frontend

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

#### 3. (Optional) Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally
# macOS
brew install redis
redis-server

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis
```

## 📝 Smart Contract Deployment

### Deploy to Ghostnet (Testnet)

```bash
# Set environment variables
export NETWORK=ghostnet
export ADMIN_KEY="edsk..."  # Your private key

# Run deployment script
cd scripts
python deploy_contracts.py
```

This will:
1. Compile all SmartPy contracts
2. Deploy to Mavryk Ghostnet
3. Save contract addresses to `deployments/ghostnet.json`
4. Generate environment file `deployments/.env.ghostnet`

### Deploy to Mainnet

```bash
export NETWORK=mainnet
export ADMIN_KEY="edsk..."  # Your mainnet private key

python deploy_contracts.py
```

**⚠️ Warning**: Mainnet deployment will cost real XTZ for origination fees. Make sure you have sufficient balance.

### Test Deployed Contracts

```bash
# Test contracts on Ghostnet
export NETWORK=ghostnet
export ADMIN_KEY="edsk..."

python test_contracts.py
```

This will:
- Update oracle prices
- Open test positions
- Create option series
- Verify contract functionality

## 🔧 Configuration

### Frontend Config

Edit `frontend/src/store/useStore.ts` to update contract addresses:

```typescript
config: {
  networkType: 'ghostnet',
  rpcUrl: 'https://rpc.ghostnet.mavryk.network',
  contracts: {
    perpetuals: 'KT1...',
    options: 'KT1...',
    euphToken: 'KT1...',
    oracle: 'KT1...',
  },
}
```

### Backend Config

Edit `backend/.env`:

```env
# Contract addresses from deployment
PERPETUALS_CONTRACT=KT1...
OPTIONS_CONTRACT=KT1...
EUPH_TOKEN_CONTRACT=KT1...
ORACLE_CONTRACT=KT1...

# Network
MAVRYK_RPC_URL=https://rpc.ghostnet.mavryk.network
NETWORK=ghostnet

# Redis
REDIS_URL=redis://localhost:6379

# Security
FRONTEND_URL=http://localhost:3000
```

## 🧪 Testing

### Contract Tests

SmartPy tests are included in each contract file:

```bash
# Run perpetuals contract tests
smartpy test contracts/derivatives/perpetuals.py output/

# Run options contract tests
smartpy test contracts/derivatives/options.py output/

# Run token contract tests
smartpy test contracts/token/euph_token.py output/
```

### Frontend Tests

```bash
cd frontend
npm run test
```

### End-to-End Tests

```bash
# Make sure contracts are deployed and backend is running
cd frontend
npm run test:e2e
```

## 📖 Usage Guide

### Connect Wallet

1. Click "Connect Wallet" in the top right
2. Select your wallet (Temple, Kukai, or Umami)
3. Approve the connection request
4. Your address and balance will appear

### Open a Position (Perpetuals)

1. Select your risk profile (Casual/Degen/Whale)
2. Set your collateral amount (min 1 tez)
3. Click anywhere on the chart to open a position:
   - Click **above** current price → **LONG**
   - Click **below** current price → **SHORT**
4. Confirm the transaction in your wallet
5. Wait for confirmation (usually <30 seconds)
6. Your position appears in the "Open Positions" panel

### Close a Position

1. Find your position in the "Open Positions" panel
2. Click "Close"
3. Confirm the transaction
4. Your P&L is settled instantly

### Buy an Option

1. Switch to "Binary Options" tab
2. Select CALL (price goes UP) or PUT (price goes DOWN)
3. Set your premium (bet amount)
4. Click on the chart at your strike price
5. Confirm the transaction
6. Wait for expiry (Friday 4PM UTC)
7. Claim payout if your option is In-The-Money

### Gamification

- **Leaderboard**: Click 🏆 to see top traders
- **Achievements**: Click 🏅 to view unlocked badges
- **Daily Rewards**: Login daily to claim increasing rewards
- **Streaks**: Build a streak for bonus multipliers

## 🔐 Security

### Smart Contract Security

- ✅ **Formal Verification**: SmartPy verification blocks
- ✅ **Emergency Pause**: Admin can halt trading in emergencies
- ✅ **Multi-Sig Admin**: Critical operations require multiple signatures
- ✅ **Liquidation Protection**: Insurance fund covers shortfalls
- ✅ **Oracle Manipulation Resistance**: Price age checks, outlier detection

### Backend Security

- ✅ **Rate Limiting**: 100 requests per 15 minutes per IP
- ✅ **Geo-Blocking**: Blocks requests from restricted countries
- ✅ **Helmet.js**: Security headers (CSP, HSTS, etc.)
- ✅ **CORS**: Restricted to known origins
- ✅ **Input Validation**: All user inputs sanitized

### Frontend Security

- ✅ **XSS Protection**: React escapes by default
- ✅ **CSP Headers**: Content Security Policy
- ✅ **Secure Wallet**: Private keys never exposed
- ✅ **HTTPS Only**: All production traffic encrypted

## 🐛 Known Issues

1. **Lightweight Charts on Mobile**: Touch gestures can be finicky. Use two-finger scroll for chart navigation.
2. **Beacon SDK iOS**: Safari sometimes blocks popup. Enable popups for the site.
3. **Redis Connection**: If Redis is unavailable, leaderboard/cache features are disabled but trading still works.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

```bash
# Create a feature branch
git checkout -b feature/your-feature

# Make your changes
# ... code code code ...

# Run tests
npm test

# Commit with conventional commits
git commit -m "feat: add new trading mode"

# Push and create PR
git push origin feature/your-feature
```

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Mavryk Team** for the blockchain infrastructure
- **Harbinger** for decentralized oracle network
- **SmartPy** for the contract development framework
- **Taquito** for the TypeScript SDK
- **Euphoria Finance** (Solana) for inspiration

## 📞 Support

- **Discord**: [discord.gg/tapblitz](https://discord.gg/tapblitz)
- **Twitter**: [@TapBlitz](https://twitter.com/TapBlitz)
- **Email**: support@tapblitz.finance
- **Docs**: [docs.tapblitz.finance](https://docs.tapblitz.finance)

## 🗺️ Roadmap

### Q1 2024 ✅
- [x] Core perpetuals trading
- [x] Binary options
- [x] EUPH token
- [x] Basic gamification

### Q2 2024
- [ ] Layer 2 integration
- [ ] Advanced order types (limit, stop-loss)
- [ ] Copy trading
- [ ] Mobile app (iOS/Android)

### Q3 2024
- [ ] RWA trading (real estate, commodities)
- [ ] Governance portal
- [ ] Strategy marketplace
- [ ] Social features

### Q4 2024
- [ ] Cross-chain bridges
- [ ] Institutional features
- [ ] API for algo trading
- [ ] White-label solution

## ⚠️ Risk Disclaimer

**Trading derivatives involves significant risk of loss. You should only trade with capital you can afford to lose.**

- Leverage can amplify both gains and losses
- Binary options can result in total loss of premium
- Smart contract risk: bugs could lead to loss of funds
- Oracle risk: incorrect prices could trigger improper liquidations
- Market risk: crypto markets are highly volatile

**By using TapBlitz, you acknowledge these risks and trade at your own discretion.**

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/TapBlitz&type=Date)](https://star-history.com/#yourusername/TapBlitz&Date)

---

**Built with ❤️ on Mavryk Blockchain**

[Website](https://tapblitz.finance) • [Twitter](https://twitter.com/TapBlitz) • [Discord](https://discord.gg/tapblitz) • [GitHub](https://github.com/yourusername/TapBlitz)
