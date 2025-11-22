# TapBlitz Architecture

## System Overview

TapBlitz is a gamified derivatives trading platform built on the Mavryk blockchain, featuring one-tap trading, perpetual futures, binary options, and comprehensive gamification elements.

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         React + TypeScript + TailwindCSS Frontend        │  │
│  │  • Interactive Trading Chart (Lightweight Charts)        │  │
│  │  • One-Tap Trading Interface                            │  │
│  │  • Wallet Connection (Beacon SDK)                       │  │
│  │  • Gamification UI (Leaderboards, Achievements)         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓  ↑
                    WebSocket/HTTP REST API
                              ↓  ↑
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND SERVICES                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Node.js/Express API Server                     │  │
│  │  • Blockchain Indexer (real-time event monitoring)       │  │
│  │  • Leaderboard Calculation                              │  │
│  │  • Achievement Tracking                                  │  │
│  │  • Daily Rewards Management                             │  │
│  │  • Geo-blocking Middleware                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Redis Cache                                 │  │
│  │  • Price feed caching                                    │  │
│  │  • Leaderboard caching                                   │  │
│  │  • User session data                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓  ↑
                        RPC Calls / Views
                              ↓  ↑
┌─────────────────────────────────────────────────────────────────┐
│                      MAVRYK BLOCKCHAIN                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Smart Contracts (SmartPy → Michelson)                   │  │
│  │                                                           │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  1. Perpetuals Contract                            │  │  │
│  │  │     • Open/Close positions                         │  │  │
│  │  │     • Liquidation engine                           │  │  │
│  │  │     • Funding rate mechanism                       │  │  │
│  │  │     • Position tracking                            │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  2. Binary Options Contract                        │  │  │
│  │  │     • Weekly series creation                       │  │  │
│  │  │     • Option buying (CALL/PUT)                     │  │  │
│  │  │     • Settlement at expiry                         │  │  │
│  │  │     • Payout distribution                          │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  3. EUPH Token (FA2)                               │  │  │
│  │  │     • ERC-20 compatible token                      │  │  │
│  │  │     • Staking mechanism                            │  │  │
│  │  │     • Governance voting                            │  │  │
│  │  │     • Fee discounts for stakers                    │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  4. Oracle Integration (Harbinger)                 │  │  │
│  │  │     • Price feed aggregation                       │  │  │
│  │  │     • BTC/USD, ETH/USD feeds                       │  │  │
│  │  │     • RWA price feeds (future)                     │  │  │
│  │  │     • Manipulation resistance                      │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Frontend Layer

**Technology Stack:**
- React 18 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Zustand for state management
- Framer Motion for animations
- Lightweight Charts for price charts

**Key Features:**
- **One-Tap Trading**: Click anywhere on the chart to open positions
- **Risk Profiles**: Casual (5x), Degenerate (20x), Whale (10x)
- **Real-time Updates**: WebSocket connections for live price feeds
- **Responsive Design**: Mobile-first, works on all devices
- **Gamification**: Streaks, achievements, leaderboards, daily rewards

### 2. Backend Layer

**Technology Stack:**
- Node.js + Express
- TypeScript
- Redis for caching
- Taquito for blockchain interaction

**Services:**
- **Indexer Service**: Monitors blockchain events, indexes positions/options
- **Leaderboard Service**: Calculates rankings based on P&L
- **Achievement Service**: Tracks user progress towards achievements
- **Rewards Service**: Manages daily login rewards and streaks
- **Price Feed Service**: Aggregates and caches oracle prices

**Security Features:**
- Geo-blocking for restricted jurisdictions
- Rate limiting (100 req/15min per IP)
- Helmet.js security headers
- Input validation and sanitization

### 3. Smart Contract Layer

#### Perpetuals Contract (`perpetuals.py`)

**Storage:**
```python
{
  positions: big_map<position_id, Position>,
  markets: big_map<market_id, Market>,
  user_positions: big_map<address, list<position_id>>,
  position_counter: nat,
  paused: bool,
  insurance_fund: mutez
}
```

**Entrypoints:**
- `open_position(market_id, side, risk_profile, target_price)` + collateral
- `close_position(position_id)` → realizes P&L
- `liquidate_position(position_id)` → liquidates underwater positions
- `update_funding_rate(market_id)` → updates 8-hour funding
- `update_oracle_price(market_id, price)` → oracle callback

**Capital Efficiency:**
- Cross-margin isolation
- Insurance fund for socialized losses
- Liquidation cascade prevention
- Auto-deleveraging for extreme events

#### Binary Options Contract (`options.py`)

**Storage:**
```python
{
  options: big_map<option_id, Option>,
  series: big_map<series_id, WeeklySeries>,
  prize_pool: mutez,
  option_counter: nat
}
```

**Entrypoints:**
- `create_weekly_series(market_id)` → admin only
- `buy_option(series_id, option_type, strike_price)` + premium
- `settle_series(series_id, settlement_price)` → admin/oracle
- `claim_payout(option_id)` → user claims if ITM

**Payout Structure:**
- 1.95x multiplier for winners (5% fee)
- Binary outcome: win full amount or lose premium
- Weekly expiry (Friday 4PM UTC)

#### EUPH Token Contract (`euph_token.py`)

**FA2 Standard Implementation:**
- Token ID: 0
- Decimals: 6
- Total Supply: 1,000,000,000 EUPH

**Features:**
- Staking with 10% APY rewards
- Fee discounts (0.1% discount for stakers)
- Governance proposals (1% supply minimum to propose)
- Voting weighted by staked amount

#### Oracle Integration

**Harbinger v2 Integration:**
- Pulls BTC/USD and ETH/USD from Harbinger Normalizer
- 5-minute maximum age for price freshness
- Fallback to median of multiple sources
- On-chain view for gas-efficient reads

**Future RWA Oracles:**
- Chainlink integration for commodities
- Custom oracles for tokenized real estate
- API3 for bond yields

## Data Flow

### Opening a Position

```
1. User clicks on chart at target price
   ↓
2. Frontend validates (wallet connected, sufficient balance)
   ↓
3. Build transaction parameters:
   - market_id, side, risk_profile, target_price, collateral
   ↓
4. Sign transaction with Beacon SDK
   ↓
5. Submit to Mavryk mempool
   ↓
6. Contract validates:
   - Market is active
   - Price is valid
   - Collateral meets minimum
   ↓
7. Contract calculates:
   - Leverage based on risk profile
   - Position size (collateral × leverage)
   - Liquidation price
   ↓
8. Create position in storage
   ↓
9. Emit event (operation hash)
   ↓
10. Backend indexer picks up event
   ↓
11. Update leaderboard, check achievements
   ↓
12. Frontend polls for confirmation
   ↓
13. Display success + confetti 🎉
```

### Liquidation Process

```
1. Price oracle updates mark price
   ↓
2. Backend monitors all open positions
   ↓
3. Identify positions where:
   - LONG: current_price ≤ liquidation_price
   - SHORT: current_price ≥ liquidation_price
   ↓
4. Call liquidate_position(position_id)
   ↓
5. Contract verifies liquidation conditions
   ↓
6. Transfer 5% collateral to liquidator
   ↓
7. Transfer 95% collateral to insurance fund
   ↓
8. Update open interest
   ↓
9. Mark position as LIQUIDATED
```

## Security Architecture

### Smart Contract Security

**Formal Verification:**
- SmartPy verification blocks for critical functions
- Property testing: liquidation thresholds, P&L calculations
- Overflow/underflow protection (SmartPy default)

**Access Controls:**
- Multi-sig admin for critical operations
- Time-locked governance proposals
- Emergency pause functionality

**Attack Vectors Mitigated:**
- Reentrancy: SmartPy prevents by design
- Oracle manipulation: Price age checks, outlier detection
- Flash loan attacks: Minimum position holding time
- Funding rate manipulation: Bounds on rate changes

### Backend Security

- HTTPS/WSS only in production
- JWT authentication for write operations
- CORS restricted to known origins
- SQL injection prevention (parameterized queries)
- Rate limiting per IP and per user

### Frontend Security

- XSS prevention (React escapes by default)
- CSP headers
- Subresource Integrity (SRI) for CDN assets
- Wallet transaction signing (never expose private keys)

## Scalability

**Current Throughput:**
- Mavryk: ~60 TPS
- Expected load: 10-20 trades/minute
- Headroom: 100x

**Future Optimizations:**
- Layer 2 rollup for order matching
- Optimistic rollups for settlement
- Off-chain order books, on-chain settlement

## Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare CDN                            │
│              (Static frontend hosting + DDoS)                │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   Application Server                         │
│  • Frontend: Vercel/Netlify (auto-scaling)                  │
│  • Backend: AWS EC2/ECS (Docker containers)                 │
│  • Load Balancer: AWS ALB                                   │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                 │
│  • Redis: AWS ElastiCache (in-memory cache)                 │
│  • PostgreSQL: AWS RDS (user data, analytics)               │
│  • S3: Static assets, backups                               │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   Mavryk Blockchain                          │
│  • Mainnet: Decentralized validators                        │
│  • Smart contracts deployed on-chain                        │
└─────────────────────────────────────────────────────────────┘
```

## Monitoring & Observability

- **Logs**: CloudWatch Logs (backend), Sentry (frontend errors)
- **Metrics**: Prometheus + Grafana
- **Alerts**: PagerDuty for critical issues
- **Tracing**: OpenTelemetry for distributed tracing

**Key Metrics:**
- Contract gas usage
- Position open/close latency
- Liquidation success rate
- Oracle price freshness
- User retention (daily/weekly active)
- Total Value Locked (TVL)

## Disaster Recovery

- **Smart Contracts**: Immutable, but have emergency pause
- **Backend**: Blue-green deployment, 30-second rollback
- **Database**: Daily snapshots, point-in-time recovery
- **Insurance Fund**: Multi-sig controlled, on-chain

## Future Roadmap

1. **Layer 2 Integration** (Q2 2024)
   - Deploy on Mavryk L2 for lower fees
   - Maintain L1 settlement for security

2. **RWA Trading** (Q3 2024)
   - Tokenized real estate
   - Commodities (gold, silver, oil)
   - Government bonds

3. **Social Trading** (Q4 2024)
   - Copy trading
   - Strategy marketplace
   - Trader reputation system

4. **Mobile Apps** (2025)
   - Native iOS/Android
   - Push notifications for positions
   - Face ID/Touch ID for quick trading
