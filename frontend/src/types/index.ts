/**
 * TapBlitz Type Definitions
 */

export enum RiskProfile {
  CASUAL = 'casual',
  DEGENERATE = 'degenerate',
  WHALE = 'whale',
}

export enum PositionSide {
  LONG = 'long',
  SHORT = 'short',
}

export enum PositionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  LIQUIDATED = 'liquidated',
}

export enum OptionType {
  CALL = 'call',
  PUT = 'put',
}

export enum OptionStatus {
  ACTIVE = 'active',
  EXERCISED = 'exercised',
  EXPIRED = 'expired',
}

export interface Position {
  id: number;
  owner: string;
  side: PositionSide | 'long' | 'short';
  size: number;
  collateral: number;
  entryPrice: number;
  leverage: number;
  liquidationPrice: number;
  status: PositionStatus | 'open' | 'closed' | 'liquidated';
  openedAt: Date;
  lastFundingUpdate: Date;
  fundingAccrued: number;
  riskProfile: RiskProfile | 'casual' | 'degenerate' | 'whale';
  unrealizedPnl?: number;
  unrealizedPnlPercent?: number;
}

export interface Option {
  id: number;
  owner: string;
  optionType: OptionType | 'call' | 'put';
  strikePrice: number;
  premium: number;
  size: number;
  marketId: number;
  expiry: Date;
  status: OptionStatus | 'active' | 'exercised' | 'expired';
  createdAt: Date;
  settlementPrice?: number;
  payout?: number;
}

export interface Market {
  id: number;
  symbol: string;
  oracleAddress: string;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  nextFunding: Date;
  openInterestLong: number;
  openInterestShort: number;
  maxLeverage: number;
  minPositionSize: number;
  isActive: boolean;
  change24h?: number;
  volume24h?: number;
}

export interface User {
  address: string;
  balance: number;
  euphBalance: number;
  euphStaked: number;
  totalPnl: number;
  totalTrades: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
  level: number;
  rank: number;
  referralCode?: string;
  referredBy?: string;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  displayName?: string;
  totalPnl: number;
  totalTrades: number;
  winRate: number;
  volume: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress: number;
  maxProgress: number;
}

export interface DailyReward {
  day: number;
  amount: number;
  claimed: boolean;
  claimableAt: Date;
}

export interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TradeParams {
  marketId: number;
  side: PositionSide;
  riskProfile: RiskProfile;
  targetPrice: number;
  collateral: number;
}

export interface OptionParams {
  seriesId: number;
  optionType: OptionType;
  strikePrice: number;
  premium: number;
}

export interface ContractAddresses {
  perpetuals: string;
  options: string;
  euphToken: string;
  oracle: string;
  // DEX contracts
  router: string;
  usdt: string;
  pool: string;
  nativeMvrk: string;
}

export type NetworkType = 'mainnet' | 'ghostnet' | 'atlasnet';

export interface AppConfig {
  networkType: NetworkType;
  rpcUrl: string;
  contracts: ContractAddresses;
  maxSlippage: number;
  minCollateral: number;
  maxCollateral: number;
  enableSounds: boolean;
  enableAnimations: boolean;
  chartInterval: string;
}

// Risk profile leverage mapping
export const RISK_PROFILE_LEVERAGE: Record<RiskProfile, number> = {
  [RiskProfile.CASUAL]: 5,
  [RiskProfile.DEGENERATE]: 20,
  [RiskProfile.WHALE]: 10,
};

// Trading fee constants
export const TRADING_FEE_PERCENT = 0.003; // 0.3%
export const LIQUIDATION_FEE_PERCENT = 0.01; // 1%
export const MAINTENANCE_MARGIN_PERCENT = 0.1; // 10%

export interface NotificationPayload {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}
