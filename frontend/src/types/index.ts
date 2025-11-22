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
  side: PositionSide;
  size: number;
  collateral: number;
  entryPrice: number;
  leverage: number;
  liquidationPrice: number;
  status: PositionStatus;
  openedAt: Date;
  lastFundingUpdate: Date;
  fundingAccrued: number;
  riskProfile: RiskProfile;
  unrealizedPnl?: number;
  unrealizedPnlPercent?: number;
}

export interface Option {
  id: number;
  owner: string;
  optionType: OptionType;
  strikePrice: number;
  premium: number;
  size: number;
  marketId: number;
  expiry: Date;
  status: OptionStatus;
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
}

export interface AppConfig {
  networkType: 'mainnet' | 'ghostnet';
  rpcUrl: string;
  contracts: ContractAddresses;
  maxSlippage: number;
  minCollateral: number;
  maxCollateral: number;
  enableSounds: boolean;
  enableAnimations: boolean;
  chartInterval: string;
}

export interface NotificationPayload {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}
