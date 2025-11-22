/**
 * Mock Data Generators for Development
 */

import { Market, Achievement, DailyReward, LeaderboardEntry } from '@/types';

export const generateMockMarkets = (): Market[] => {
  return [
    {
      id: 0,
      symbol: 'BTC/USD',
      oracleAddress: 'KT1...',
      markPrice: 45000,
      indexPrice: 45000,
      fundingRate: 0.0001,
      nextFunding: new Date(Date.now() + 8 * 60 * 60 * 1000),
      openInterestLong: 1500000,
      openInterestShort: 1200000,
      maxLeverage: 50,
      minPositionSize: 1000000,
      isActive: true,
      change24h: 2.5,
      volume24h: 50000000,
    },
    {
      id: 1,
      symbol: 'ETH/USD',
      oracleAddress: 'KT1...',
      markPrice: 3000,
      indexPrice: 3000,
      fundingRate: 0.00015,
      nextFunding: new Date(Date.now() + 8 * 60 * 60 * 1000),
      openInterestLong: 800000,
      openInterestShort: 750000,
      maxLeverage: 50,
      minPositionSize: 1000000,
      isActive: true,
      change24h: -1.2,
      volume24h: 25000000,
    },
  ];
};

export const generateMockAchievements = (): Achievement[] => {
  return [
    {
      id: 'first_trade',
      name: 'First Blood',
      description: 'Open your first position',
      icon: '🎯',
      progress: 0,
      maxProgress: 1,
    },
    {
      id: 'ten_trades',
      name: 'Getting Started',
      description: 'Complete 10 trades',
      icon: '📈',
      progress: 0,
      maxProgress: 10,
    },
    {
      id: 'win_streak_5',
      name: 'Hot Streak',
      description: 'Win 5 trades in a row',
      icon: '🔥',
      progress: 0,
      maxProgress: 5,
    },
    {
      id: 'profit_100',
      name: 'Profitable Trader',
      description: 'Earn 100 tez in total profit',
      icon: '💰',
      progress: 0,
      maxProgress: 100,
    },
    {
      id: 'whale',
      name: 'Whale Status',
      description: 'Open a position worth 1000+ tez',
      icon: '🐋',
      progress: 0,
      maxProgress: 1,
    },
    {
      id: 'degen',
      name: 'True Degen',
      description: 'Use 20x+ leverage 10 times',
      icon: '🎲',
      progress: 0,
      maxProgress: 10,
    },
    {
      id: 'week_streak',
      name: 'Dedicated Trader',
      description: 'Login 7 days in a row',
      icon: '📅',
      progress: 0,
      maxProgress: 7,
    },
    {
      id: 'liquidator',
      name: 'Liquidator',
      description: 'Liquidate 5 positions',
      icon: '⚡',
      progress: 0,
      maxProgress: 5,
    },
  ];
};

export const generateMockDailyRewards = (): DailyReward[] => {
  const rewards: DailyReward[] = [];
  const baseReward = 10;

  for (let day = 1; day <= 7; day++) {
    const amount = baseReward * day; // Increasing rewards
    const claimableAt = new Date();
    claimableAt.setDate(claimableAt.getDate() - (7 - day));

    rewards.push({
      day,
      amount,
      claimed: day <= 2, // First 2 days claimed
      claimableAt,
    });
  }

  return rewards;
};

export const generateMockLeaderboard = (): LeaderboardEntry[] => {
  const names = [
    'CryptoKing',
    'DegenTrader',
    'WhaleAlert',
    'MoonBoy',
    'DiamondHands',
    'PaperHands',
    'ToTheMoon',
    'HODL_Master',
    'LeverageLord',
    'ProfitMaxx',
  ];

  return names.map((name, index) => ({
    rank: index + 1,
    address: `tz1${Math.random().toString(36).substring(2, 15)}`,
    displayName: name,
    totalPnl: (1000 - index * 50) + Math.random() * 100,
    totalTrades: Math.floor(50 + Math.random() * 200),
    winRate: 45 + Math.random() * 30,
    volume: (500000 - index * 25000) + Math.random() * 10000,
  }));
};
