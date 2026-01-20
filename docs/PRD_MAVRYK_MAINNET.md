# TapBlitz - Product Requirements Document
## Mavryk Mainnet Launch

**Version:** 1.0
**Date:** January 2026
**Status:** Draft

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Feature Requirements](#3-feature-requirements)
4. [UI/UX Specifications](#4-uiux-specifications)
5. [Gamification System](#5-gamification-system)
6. [Technical Requirements](#6-technical-requirements)
7. [Acceptance Criteria](#7-acceptance-criteria)

---

## 1. Executive Summary

### 1.1 Vision
TapBlitz is a mobile-first, gamified derivatives trading platform on Mavryk mainnet enabling one-tap trading of perpetual futures and binary options for the MVRK/USDT pair.

### 1.2 Goals
- Launch perpetuals and binary options trading for MVRK/USDT
- Deliver a mobile-optimized tap-to-trade experience
- Drive engagement through core gamification (leaderboards, achievements, rewards)
- Achieve sub-3-second trade execution on Mavryk mainnet

### 1.3 Target Users
| Segment | Description | Primary Need |
|---------|-------------|--------------|
| Crypto Natives | Experienced DeFi users | Leverage trading, capital efficiency |
| Mobile Traders | On-the-go traders | Quick, simple execution |
| Gamers/Speculators | Risk-tolerant users seeking excitement | Gamified experience, competition |

### 1.4 Success Metrics
- **DAU**: 1,000+ daily active users within 90 days
- **TVL**: $500K+ total value locked
- **Retention**: 40%+ 7-day retention rate
- **Trade Volume**: $1M+ daily trading volume

---

## 2. Product Overview

### 2.1 Product Scope

| In Scope | Out of Scope (v1) |
|----------|-------------------|
| MVRK/USDT perpetual futures | Multi-pair trading (BTC, ETH) |
| MVRK/USDT binary options | Copy trading |
| Mobile-first responsive UI | Native mobile apps |
| Core gamification | NFT badges, seasons |
| Beacon SDK wallet integration | Social trading features |

### 2.2 Trading Products

#### Perpetual Futures
- **Pair**: MVRK/USDT
- **Leverage**: 1x - 50x (via risk profiles)
- **Position Types**: Long / Short
- **Collateral**: MVRK (native token)
- **Settlement**: Continuous (no expiry)

#### Binary Options
- **Pair**: MVRK/USDT
- **Types**: CALL (Up) / PUT (Down)
- **Expiry**: Weekly (Friday 16:00 UTC)
- **Payout**: 1.95x (5% platform fee)
- **Premium Range**: 0.1 - 1,000 MVRK

---

## 3. Feature Requirements

### 3.1 Perpetual Futures Trading

#### FR-PF-001: One-Tap Position Opening
**Priority:** P0 (Critical)

**Description:**
Users can open leveraged positions by tapping on the price chart. Tapping above current price opens a LONG, tapping below opens a SHORT.

**Functional Requirements:**
| ID | Requirement |
|----|-------------|
| FR-PF-001a | Tap above price line = LONG position intent |
| FR-PF-001b | Tap below price line = SHORT position intent |
| FR-PF-001c | Display confirmation modal with position details |
| FR-PF-001d | Show entry price, liquidation price, potential P&L |
| FR-PF-001e | Require wallet connection before execution |

**User Flow:**
```
1. User views MVRK/USDT chart
2. User taps on chart (above/below price)
3. System detects tap position relative to current price
4. Confirmation modal appears with:
   - Direction (LONG/SHORT)
   - Entry price
   - Risk profile selector
   - Collateral input
   - Leverage display
   - Liquidation price
   - Estimated fees
5. User confirms or cancels
6. On confirm: transaction submitted to blockchain
7. Success/failure feedback displayed
```

---

#### FR-PF-002: Risk Profile System
**Priority:** P0 (Critical)

**Description:**
Pre-configured risk profiles simplify leverage selection for different trader types.

**Risk Profile Definitions:**
| Profile | Leverage | Max Loss | Target User |
|---------|----------|----------|-------------|
| **Casual** | 5x | 100% of collateral | Conservative traders |
| **Degen** | 20x | 100% of collateral | High-risk traders |
| **Whale** | 10x | 100% of collateral | Balanced approach |

**Functional Requirements:**
| ID | Requirement |
|----|-------------|
| FR-PF-002a | Display 3 risk profile options in trade modal |
| FR-PF-002b | Default to "Casual" (5x) for new users |
| FR-PF-002c | Show leverage multiplier prominently |
| FR-PF-002d | Calculate and display liquidation price per profile |
| FR-PF-002e | Persist user's last selected profile |

---

#### FR-PF-003: Position Management
**Priority:** P0 (Critical)

**Description:**
Users can view, monitor, and close their open positions.

**Functional Requirements:**
| ID | Requirement |
|----|-------------|
| FR-PF-003a | Display all open positions in collapsible panel |
| FR-PF-003b | Show real-time unrealized P&L (updated every 5s) |
| FR-PF-003c | Display liquidation price with warning threshold |
| FR-PF-003d | One-tap close position button |
| FR-PF-003e | Show position details: size, entry, leverage, funding |
| FR-PF-003f | Color-code P&L (green = profit, red = loss) |

**Position Card Data:**
```
┌─────────────────────────────────────┐
│ MVRK/USDT LONG          5x Casual  │
│ ─────────────────────────────────── │
│ Size: 100 MVRK    Entry: $0.4521   │
│ P&L: +$12.45 (+27.5%)     [CLOSE]  │
│ Liq: $0.3617 ⚠️                     │
└─────────────────────────────────────┘
```

---

#### FR-PF-004: Liquidation System
**Priority:** P0 (Critical)

**Description:**
Automatic liquidation of underwater positions to protect platform solvency.

**Functional Requirements:**
| ID | Requirement |
|----|-------------|
| FR-PF-004a | Liquidate when margin ratio < 10% |
| FR-PF-004b | Display liquidation warnings at 20% and 15% margin |
| FR-PF-004c | Push notification when position near liquidation |
| FR-PF-004d | Insurance fund covers underwater liquidations |
| FR-PF-004e | Liquidation fee: 1% of position size |

---

#### FR-PF-005: Funding Rate Mechanism
**Priority:** P1 (High)

**Description:**
8-hour funding payments to balance long/short open interest.

**Functional Requirements:**
| ID | Requirement |
|----|-------------|
| FR-PF-005a | Calculate funding rate every 8 hours |
| FR-PF-005b | Display current funding rate on UI |
| FR-PF-005c | Show next funding time countdown |
| FR-PF-005d | Auto-deduct/credit funding from positions |
| FR-PF-005e | Display funding history in position details |

---

### 3.2 Binary Options Trading

#### FR-BO-001: Weekly Options Purchase
**Priority:** P0 (Critical)

**Description:**
Users can buy CALL or PUT options predicting MVRK price direction by weekly expiry.

**Functional Requirements:**
| ID | Requirement |
|----|-------------|
| FR-BO-001a | Display current weekly series with expiry countdown |
| FR-BO-001b | Show strike price (current price at series creation) |
| FR-BO-001c | CALL button: predict price > strike at expiry |
| FR-BO-001d | PUT button: predict price < strike at expiry |
| FR-BO-001e | Premium input with min/max validation |
| FR-BO-001f | Display potential payout (premium × 1.95) |

**Options Interface:**
```
┌─────────────────────────────────────┐
│     MVRK/USDT Weekly Options        │
│     Expires: Fri 16:00 UTC          │
│     ⏱️ 3d 14h 22m remaining         │
│ ─────────────────────────────────── │
│     Strike Price: $0.4500           │
│     Current Price: $0.4521          │
│ ─────────────────────────────────── │
│  [🟢 CALL]           [🔴 PUT]       │
│   Price Up            Price Down    │
│ ─────────────────────────────────── │
│  Premium: [____] MVRK               │
│  Potential Win: ___ MVRK (1.95x)    │
│           [BUY OPTION]              │
└─────────────────────────────────────┘
```

---

#### FR-BO-002: Options Portfolio
**Priority:** P0 (Critical)

**Description:**
Users can view their purchased options and claim payouts.

**Functional Requirements:**
| ID | Requirement |
|----|-------------|
| FR-BO-002a | List all user's options (active and settled) |
| FR-BO-002b | Show option type, premium, strike, expiry |
| FR-BO-002c | Display status: Active / Won / Lost |
| FR-BO-002d | One-tap claim button for winning options |
| FR-BO-002e | Auto-settle options at expiry |

---

### 3.3 Wallet Integration

#### FR-WL-001: Beacon SDK Connection
**Priority:** P0 (Critical)

**Description:**
Seamless wallet connection supporting major Mavryk wallets.

**Supported Wallets:**
- Temple Wallet
- Kukai Wallet
- Umami Wallet

**Functional Requirements:**
| ID | Requirement |
|----|-------------|
| FR-WL-001a | Display wallet connect button in header |
| FR-WL-001b | Show wallet selector modal with supported wallets |
| FR-WL-001c | Display connected address (truncated) |
| FR-WL-001d | Show MVRK balance |
| FR-WL-001e | One-tap disconnect option |
| FR-WL-001f | Persist connection across sessions |
| FR-WL-001g | Display risk disclaimer on first connection |

---

#### FR-WL-002: Transaction Management
**Priority:** P0 (Critical)

**Description:**
Clear transaction status feedback during blockchain operations.

**Functional Requirements:**
| ID | Requirement |
|----|-------------|
| FR-WL-002a | Show pending state during wallet confirmation |
| FR-WL-002b | Display transaction hash on submission |
| FR-WL-002c | Show confirmation progress (0/1 confirmations) |
| FR-WL-002d | Success toast with confetti animation |
| FR-WL-002e | Error handling with retry option |
| FR-WL-002f | Link to block explorer for transaction |

---

### 3.4 Price Feed & Chart

#### FR-PC-001: Real-Time Price Display
**Priority:** P0 (Critical)

**Description:**
Live MVRK/USDT price from Mavryk DEX with chart visualization.

**Functional Requirements:**
| ID | Requirement |
|----|-------------|
| FR-PC-001a | Fetch price from Mavryk DEX pool reserves |
| FR-PC-001b | Update price every 5 seconds |
| FR-PC-001c | Display current price prominently |
| FR-PC-001d | Show 24h change (% and absolute) |
| FR-PC-001e | Display 24h high/low |
| FR-PC-001f | Interactive candlestick chart |

**Price Data Source:**
```
DEX Pool: KT1Mp34odc6bZLbZzY1BXb5m4KSHZcZswHcY
Router: KT1RRPjU5q12uPf5E2xGJodU8VA99skWKcmJ
USDT: KT1D7ZQBhwxkMgZThqctYtMXigFvJRZL4eSy
```

---

#### FR-PC-002: Interactive Trading Chart
**Priority:** P0 (Critical)

**Description:**
Tap-enabled candlestick chart for one-tap trading.

**Functional Requirements:**
| ID | Requirement |
|----|-------------|
| FR-PC-002a | Candlestick chart with 15m default timeframe |
| FR-PC-002b | Timeframe options: 1m, 5m, 15m, 1h, 4h, 1d |
| FR-PC-002c | Current price line indicator |
| FR-PC-002d | Tap detection with position intent |
| FR-PC-002e | Visual feedback on tap (ripple effect) |
| FR-PC-002f | Pinch-to-zoom on mobile |
| FR-PC-002g | Horizontal scroll for history |

---

## 4. UI/UX Specifications

### 4.1 Design Principles

| Principle | Description |
|-----------|-------------|
| **Mobile-First** | Designed for thumb-zone navigation on phones |
| **One-Tap Actions** | Core actions require single tap |
| **Dark Theme** | Reduces eye strain, professional trading aesthetic |
| **Instant Feedback** | Every action has immediate visual response |
| **Minimal Cognitive Load** | Show only essential information |

### 4.2 Design System

#### Color Palette
```
Background:
  Primary:    #0D0D0F (near black)
  Secondary:  #1A1A1F (card backgrounds)
  Tertiary:   #252530 (elevated surfaces)

Accent:
  Primary:    #EC4899 (pink - brand color)
  Secondary:  #8B5CF6 (purple - secondary actions)

Semantic:
  Success:    #10B981 (green - profit, long)
  Danger:     #EF4444 (red - loss, short)
  Warning:    #F59E0B (yellow - alerts)
  Info:       #3B82F6 (blue - information)

Text:
  Primary:    #FFFFFF (headings, important)
  Secondary:  #A1A1AA (body text)
  Muted:      #71717A (labels, captions)
```

#### Typography
```
Font Family: Inter (system fallback: -apple-system, sans-serif)

Sizes:
  Display:    32px / 40px line-height (price display)
  Heading 1:  24px / 32px (section titles)
  Heading 2:  20px / 28px (card titles)
  Body:       16px / 24px (default text)
  Caption:    14px / 20px (labels)
  Small:      12px / 16px (timestamps)

Weights:
  Bold:       700 (headings, emphasis)
  Semibold:   600 (buttons, labels)
  Regular:    400 (body text)
```

#### Spacing Scale
```
4px  (xs)  - tight spacing
8px  (sm)  - element padding
12px (md)  - component gaps
16px (lg)  - section padding
24px (xl)  - card padding
32px (2xl) - section margins
```

#### Border Radius
```
Small:   4px  (buttons, inputs)
Medium:  8px  (cards, modals)
Large:   12px (panels)
Full:    9999px (pills, avatars)
```

---

### 4.3 Screen Layouts

#### 4.3.1 Main Trading Screen
**Purpose:** Primary trading interface with chart and quick actions

```
┌─────────────────────────────────────┐
│ ≡  TapBlitz    💰 1,234 MVRK  [👤] │ ← Header (56px)
├─────────────────────────────────────┤
│                                     │
│         MVRK/USDT                   │
│         $0.4521  +5.2%              │ ← Price Display
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │    [Candlestick Chart]      │   │ ← Chart Area
│  │    Tap to Trade             │   │    (60% of screen)
│  │                             │   │
│  │    ─────── $0.4521 ───────  │   │ ← Price Line
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  1m  5m [15m] 1h  4h  1d           │ ← Timeframe Selector
│                                     │
├─────────────────────────────────────┤
│ ▼ Open Positions (2)               │ ← Positions Panel
│ ┌─────────────────────────────────┐│    (Collapsible)
│ │ LONG 5x  +$12.45  [Close]      ││
│ └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  [📈 Trade]  [📊 Options]  [👤 Me] │ ← Bottom Nav (64px)
└─────────────────────────────────────┘
```

---

#### 4.3.2 Trade Confirmation Modal
**Purpose:** Confirm position details before execution

```
┌─────────────────────────────────────┐
│              LONG MVRK              │
│         ───────────────             │
│                                     │
│  Entry Price         $0.4550        │
│  Current Price       $0.4521        │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Risk Profile                │   │
│  │ [Casual]  [Degen]  [Whale]  │   │ ← Toggle Buttons
│  │    5x       20x      10x    │   │
│  └─────────────────────────────┘   │
│                                     │
│  Collateral                         │
│  ┌─────────────────────────────┐   │
│  │ [100]                  MVRK │   │ ← Input Field
│  └─────────────────────────────┘   │
│  Available: 1,234 MVRK             │
│                                     │
│  ─────────────────────────────     │
│  Position Size        500 MVRK     │
│  Liquidation Price    $0.3617      │
│  Trading Fee          0.30 MVRK    │
│  ─────────────────────────────     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │     CONFIRM LONG TRADE      │   │ ← Primary CTA
│  └─────────────────────────────┘   │
│                                     │
│           [Cancel]                  │
└─────────────────────────────────────┘
```

---

#### 4.3.3 Binary Options Screen
**Purpose:** Weekly options trading interface

```
┌─────────────────────────────────────┐
│ ≡  TapBlitz    💰 1,234 MVRK  [👤] │
├─────────────────────────────────────┤
│                                     │
│      MVRK/USDT Weekly Options       │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Expires: Fri, Jan 24      │   │
│  │   ⏱️ 3d 14h 22m             │   │ ← Countdown Timer
│  └─────────────────────────────┘   │
│                                     │
│      Strike: $0.4500                │
│      Current: $0.4521 (+0.47%)      │
│                                     │
│  ┌──────────┐    ┌──────────┐      │
│  │   CALL   │    │   PUT    │      │
│  │    📈    │    │    📉    │      │ ← Large Tap Targets
│  │ Price Up │    │Price Down│      │
│  └──────────┘    └──────────┘      │
│                                     │
│  Premium Amount                     │
│  ┌─────────────────────────────┐   │
│  │ [10]                   MVRK │   │
│  └─────────────────────────────┘   │
│  Min: 0.1  |  Max: 1,000           │
│                                     │
│  Potential Payout: 19.5 MVRK       │
│                                     │
├─────────────────────────────────────┤
│ ▼ Your Options (3)                 │
│ ┌─────────────────────────────────┐│
│ │ CALL  10 MVRK  Won  [Claim]    ││
│ │ PUT   5 MVRK   Active          ││
│ └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  [📈 Trade]  [📊 Options]  [👤 Me] │
└─────────────────────────────────────┘
```

---

#### 4.3.4 Profile/Dashboard Screen
**Purpose:** User stats, achievements, and rewards

```
┌─────────────────────────────────────┐
│ ≡  TapBlitz    💰 1,234 MVRK  [👤] │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │  👤  mvrk1...abc            │   │
│  │  Level 12 Trader            │   │
│  │  🔥 7-day streak            │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │ +$245  │ │  68%   │ │  142   │  │
│  │Total PL│ │Win Rate│ │ Trades │  │ ← Stats Cards
│  └────────┘ └────────┘ └────────┘  │
│                                     │
│  ─────────────────────────────     │
│  📅 Daily Rewards                  │
│  ┌─────────────────────────────┐   │
│  │ [✓] [✓] [✓] [●] [ ] [ ] [ ] │   │ ← 7-day tracker
│  │  M   T   W   T   F   S   S  │   │
│  │                             │   │
│  │   Today: 40 EUPH  [Claim]   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ─────────────────────────────     │
│  🏆 Achievements (5/12)            │
│  ┌─────────────────────────────┐   │
│  │ 🎯 First Blood    ✓         │   │
│  │ 📈 10 Trades      ✓         │   │
│  │ 🔥 5 Win Streak   3/5       │   │ ← Progress bars
│  │ 💰 100 Profit     67/100    │   │
│  └─────────────────────────────┘   │
│  [View All Achievements →]         │
│                                     │
├─────────────────────────────────────┤
│  [📈 Trade]  [📊 Options]  [👤 Me] │
└─────────────────────────────────────┘
```

---

#### 4.3.5 Leaderboard Modal
**Purpose:** Global ranking display

```
┌─────────────────────────────────────┐
│         🏆 Leaderboard              │
│                                     │
│  This Week's Top Traders            │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🥇 mvrk1...xyz   +$4,521    │   │
│  │ 🥈 mvrk1...abc   +$3,892    │   │
│  │ 🥉 mvrk1...def   +$2,105    │   │
│  │ 4  mvrk1...ghi   +$1,876    │   │
│  │ 5  mvrk1...jkl   +$1,234    │   │
│  │ ─────────────────────────── │   │
│  │ 47 mvrk1...YOU   +$245  ←  │   │ ← Highlighted
│  └─────────────────────────────┘   │
│                                     │
│  Your Rank: #47 of 1,234 traders   │
│                                     │
│           [Close]                   │
└─────────────────────────────────────┘
```

---

### 4.4 Component Specifications

#### 4.4.1 Header Component
**Height:** 56px
**Position:** Fixed top

```
Props:
  - balance: number (MVRK balance)
  - isConnected: boolean
  - onMenuClick: () => void
  - onProfileClick: () => void

States:
  - Connected: Shows truncated address + balance
  - Disconnected: Shows "Connect Wallet" button
```

---

#### 4.4.2 Bottom Navigation
**Height:** 64px + safe area
**Position:** Fixed bottom

```
Tabs:
  1. Trade (📈) - Main trading screen
  2. Options (📊) - Binary options screen
  3. Profile (👤) - Dashboard/stats

Active State: Pink accent color + label
Inactive State: Muted gray
```

---

#### 4.4.3 Position Card
**Purpose:** Display open position summary

```
Props:
  - position: Position
  - currentPrice: number
  - onClose: (id) => void

Display:
  - Market pair (MVRK/USDT)
  - Direction badge (LONG green / SHORT red)
  - Leverage pill (5x, 10x, 20x)
  - Size in MVRK
  - Entry price
  - Unrealized P&L (color-coded)
  - P&L percentage
  - Liquidation price with warning icon if <20% margin
  - Close button
```

---

#### 4.4.4 Risk Profile Selector
**Purpose:** Toggle between leverage presets

```
Props:
  - selected: 'casual' | 'degen' | 'whale'
  - onChange: (profile) => void

Layout: 3 horizontal toggle buttons
Selected: Filled with accent color
Unselected: Outlined

Displays:
  - Profile name
  - Leverage multiplier
```

---

#### 4.4.5 Collateral Input
**Purpose:** Enter position collateral amount

```
Props:
  - value: number
  - max: number (available balance)
  - onChange: (value) => void

Features:
  - Numeric input
  - Max button (fills available balance)
  - MVRK suffix
  - Available balance display
  - Validation (min: 1 MVRK)
```

---

### 4.5 Interaction Patterns

#### 4.5.1 Tap-to-Trade Flow
```
1. User taps on chart
   → Ripple animation at tap point
   → Haptic feedback (if enabled)

2. System determines direction
   → Tap Y > price line = SHORT
   → Tap Y < price line = LONG

3. Modal slides up from bottom
   → 300ms spring animation
   → Backdrop blur

4. User configures and confirms
   → Button shows loading state
   → Disable interactions

5. Transaction result
   → Success: Confetti + toast + sound
   → Failure: Error toast + retry option
```

---

#### 4.5.2 Pull-to-Refresh
```
Location: Positions panel, Options list
Threshold: 80px pull distance
Feedback: Spinner animation
Action: Refetch user data from blockchain
```

---

#### 4.5.3 Swipe Actions
```
Position Cards:
  - Swipe left: Reveal close button
  - Swipe threshold: 100px

Options Cards:
  - Swipe left: Reveal claim button (if won)
```

---

### 4.6 Responsive Breakpoints

```
Mobile (default):   320px - 767px
  - Single column layout
  - Bottom navigation
  - Full-width cards

Tablet:             768px - 1023px
  - Two-column positions
  - Larger chart area

Desktop:            1024px+
  - Sidebar navigation
  - Multi-panel layout
  - Keyboard shortcuts
```

---

### 4.7 Animation Specifications

| Animation | Duration | Easing | Trigger |
|-----------|----------|--------|---------|
| Modal enter | 300ms | spring(1, 0.9, 0.1) | Open modal |
| Modal exit | 200ms | ease-out | Close modal |
| Tap ripple | 400ms | ease-out | Chart tap |
| Button press | 100ms | ease-in-out | Button tap |
| Toast enter | 200ms | ease-out | Notification |
| Confetti | 3000ms | physics | Trade success |
| Number change | 300ms | ease-out | P&L update |
| Skeleton pulse | 1500ms | ease-in-out | Loading state |

---

### 4.8 Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Color contrast | Minimum 4.5:1 for text |
| Touch targets | Minimum 44x44px |
| Focus indicators | 2px pink outline |
| Screen readers | ARIA labels on interactive elements |
| Motion reduce | Respect prefers-reduced-motion |
| Font scaling | Support up to 200% zoom |

---

## 5. Gamification System

### 5.1 Leaderboard

#### GL-001: Global Rankings
**Priority:** P1 (High)

**Ranking Criteria:** Total realized P&L (MVRK)

**Leaderboard Structure:**
| Rank | Display | Badge |
|------|---------|-------|
| 1 | Full address + P&L | 🏆 Gold |
| 2 | Full address + P&L | 🥈 Silver |
| 3 | Full address + P&L | 🥉 Bronze |
| 4-10 | Truncated address + P&L | None |
| 11+ | Truncated address + P&L | None |

**Functional Requirements:**
| ID | Requirement |
|----|-------------|
| GL-001a | Update leaderboard every 5 minutes |
| GL-001b | Show top 50 traders |
| GL-001c | Highlight current user's position |
| GL-001d | Display user's rank if outside top 50 |
| GL-001e | Show total trader count |

---

### 5.2 Achievement System

#### GA-001: Achievement Definitions
**Priority:** P1 (High)

**Achievement List:**

| ID | Name | Description | Criteria | Reward |
|----|------|-------------|----------|--------|
| ACH-001 | First Blood | Open your first position | 1 trade | 10 EUPH |
| ACH-002 | Getting Started | Complete 10 trades | 10 trades | 25 EUPH |
| ACH-003 | Centurion | Complete 100 trades | 100 trades | 100 EUPH |
| ACH-004 | Hot Streak | Win 5 trades in a row | 5 consecutive wins | 50 EUPH |
| ACH-005 | On Fire | Win 10 trades in a row | 10 consecutive wins | 150 EUPH |
| ACH-006 | Profitable | Earn 100 MVRK profit | 100 MVRK total P&L | 75 EUPH |
| ACH-007 | Whale | Open 500+ MVRK position | Single position ≥500 | 50 EUPH |
| ACH-008 | Survivor | Close 50 positions before liquidation | 50 safe closes | 100 EUPH |
| ACH-009 | Weekly Warrior | Trade every day for 7 days | 7-day activity streak | 100 EUPH |
| ACH-010 | Top 10 | Reach top 10 on leaderboard | Leaderboard rank ≤10 | 200 EUPH |
| ACH-011 | Options Master | Win 20 binary options | 20 ITM options | 100 EUPH |
| ACH-012 | Diamond Hands | Hold position for 7 days | 7-day position duration | 75 EUPH |

**Functional Requirements:**
| ID | Requirement |
|----|-------------|
| GA-001a | Track progress for all achievements |
| GA-001b | Display progress bar for incomplete achievements |
| GA-001c | Show unlock animation on completion |
| GA-001d | Auto-credit EUPH reward on unlock |
| GA-001e | Display locked/unlocked state |

---

### 5.3 Daily Rewards

#### GR-001: 7-Day Reward Cycle
**Priority:** P1 (High)

**Reward Schedule:**
| Day | Reward | Cumulative |
|-----|--------|------------|
| 1 | 10 EUPH | 10 EUPH |
| 2 | 20 EUPH | 30 EUPH |
| 3 | 30 EUPH | 60 EUPH |
| 4 | 40 EUPH | 100 EUPH |
| 5 | 50 EUPH | 150 EUPH |
| 6 | 60 EUPH | 210 EUPH |
| 7 | 70 EUPH + 100 bonus | 380 EUPH |

**Functional Requirements:**
| ID | Requirement |
|----|-------------|
| GR-001a | Reset cycle at midnight UTC |
| GR-001b | Require wallet connection to claim |
| GR-001c | One claim per day maximum |
| GR-001d | Display streak counter |
| GR-001e | Show upcoming rewards |
| GR-001f | Streak breaks after 48h without claim |
| GR-001g | Visual indicator for claimable reward |

---

## 6. Technical Requirements

### 6.1 Blockchain Integration

| Requirement | Specification |
|-------------|---------------|
| Network | Mavryk Mainnet |
| RPC Endpoint | https://rpc.mavryk.network |
| Block Time | ~30 seconds |
| Confirmation | 1 block minimum |
| Wallet SDK | Beacon SDK 4.x |
| Contract SDK | Taquito 19.x |

### 6.2 Smart Contract Addresses (Mainnet TBD)

```
PERPETUALS:   KT1___________________ (to be deployed)
OPTIONS:      KT1___________________ (to be deployed)
EUPH_TOKEN:   KT1___________________ (to be deployed)
ORACLE:       KT1___________________ (Harbinger mainnet)
DEX_ROUTER:   KT1RRPjU5q12uPf5E2xGJodU8VA99skWKcmJ
DEX_POOL:     KT1Mp34odc6bZLbZzY1BXb5m4KSHZcZswHcY
USDT:         KT1D7ZQBhwxkMgZThqctYtMXigFvJRZL4eSy
```

### 6.3 Performance Requirements

| Metric | Target |
|--------|--------|
| Initial Load | < 3 seconds (LTE) |
| Chart Render | < 500ms |
| Price Update | Every 5 seconds |
| Trade Confirmation | < 60 seconds |
| API Response | < 200ms (p95) |
| Uptime | 99.5% |

### 6.4 Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| Wallet Security | Private keys never leave wallet |
| Transaction Signing | User confirms each transaction |
| Rate Limiting | 100 requests/15min per IP |
| Input Validation | Sanitize all user inputs |
| HTTPS | Required for all connections |
| CSP Headers | Strict content security policy |

---

## 7. Acceptance Criteria

### 7.1 Core Trading (P0)

- [ ] User can connect Mavryk wallet via Beacon SDK
- [ ] User can view real-time MVRK/USDT price from DEX
- [ ] User can tap on chart to initiate LONG/SHORT position
- [ ] User can select risk profile (5x, 10x, 20x leverage)
- [ ] User can enter collateral amount
- [ ] User can confirm and execute trade on-chain
- [ ] User can view open positions with real-time P&L
- [ ] User can close positions with one tap
- [ ] User can purchase CALL/PUT binary options
- [ ] User can claim winning option payouts

### 7.2 UI/UX (P0)

- [ ] Mobile-first responsive design works on 320px+ screens
- [ ] Dark theme with consistent color palette
- [ ] All touch targets minimum 44x44px
- [ ] Loading states for all async operations
- [ ] Error handling with user-friendly messages
- [ ] Transaction status feedback (pending/success/error)

### 7.3 Gamification (P1)

- [ ] Leaderboard displays top 50 traders by P&L
- [ ] User's rank shown if outside top 50
- [ ] Achievement progress tracked and displayed
- [ ] Achievements unlock with animation and EUPH reward
- [ ] Daily rewards claimable once per day
- [ ] 7-day streak tracked with bonus on completion

### 7.4 Performance (P1)

- [ ] Initial page load < 3 seconds on LTE
- [ ] Price updates every 5 seconds without UI jank
- [ ] Smooth 60fps animations
- [ ] Works offline-capable for viewing (not trading)

---

## Appendix A: User Stories

### Trading
- As a trader, I want to open a leveraged position with one tap so that I can trade quickly
- As a trader, I want to see my liquidation price so that I can manage risk
- As a trader, I want to close my position instantly so that I can lock in profits/losses
- As a trader, I want to buy binary options so that I can speculate on weekly price movements

### Gamification
- As a user, I want to see my ranking so that I can compete with other traders
- As a user, I want to earn achievements so that I feel rewarded for my activity
- As a user, I want to claim daily rewards so that I have incentive to return

### Wallet
- As a user, I want to connect my existing wallet so that I can trade with my funds
- As a user, I want to see my balance so that I know how much I can trade

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| MVRK | Native token of Mavryk blockchain |
| Perpetual | Futures contract with no expiry date |
| Liquidation | Forced closure when margin falls below threshold |
| Funding Rate | Periodic payment between longs and shorts |
| Binary Option | All-or-nothing option settled at expiry |
| CALL | Option betting price will be above strike |
| PUT | Option betting price will be below strike |
| Strike Price | Reference price for option settlement |
| Premium | Amount paid to purchase an option |
| EUPH | Platform governance and reward token |
| Beacon SDK | Wallet connection standard for Mavryk |

---

*End of PRD Document*
