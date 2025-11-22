/**
 * TapBlitz Global State Store (Zustand)
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  User,
  Position,
  Option,
  Market,
  LeaderboardEntry,
  Achievement,
  DailyReward,
  AppConfig,
} from '@/types';

interface AppState {
  // User state
  user: User | null;
  isConnected: boolean;
  walletAddress: string | null;

  // Trading state
  positions: Position[];
  options: Option[];
  markets: Market[];
  selectedMarket: Market | null;
  currentPrice: number;

  // Gamification
  achievements: Achievement[];
  dailyRewards: DailyReward[];
  leaderboard: LeaderboardEntry[];

  // UI state
  showWalletModal: boolean;
  showPositionsPanel: boolean;
  showLeaderboard: boolean;
  showAchievements: boolean;
  soundEnabled: boolean;
  animationsEnabled: boolean;

  // App config
  config: AppConfig;

  // Actions
  setUser: (user: User | null) => void;
  connectWallet: (address: string) => void;
  disconnectWallet: () => void;
  addPosition: (position: Position) => void;
  updatePosition: (id: number, updates: Partial<Position>) => void;
  removePosition: (id: number) => void;
  addOption: (option: Option) => void;
  updateOption: (id: number, updates: Partial<Option>) => void;
  setMarkets: (markets: Market[]) => void;
  selectMarket: (market: Market) => void;
  updateMarketPrice: (marketId: number, price: number) => void;
  setAchievements: (achievements: Achievement[]) => void;
  unlockAchievement: (achievementId: string) => void;
  setDailyRewards: (rewards: DailyReward[]) => void;
  claimDailyReward: (day: number) => void;
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  toggleWalletModal: () => void;
  togglePositionsPanel: () => void;
  toggleLeaderboard: () => void;
  toggleAchievements: () => void;
  toggleSound: () => void;
  toggleAnimations: () => void;
  setConfig: (config: Partial<AppConfig>) => void;
}

export const useStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isConnected: false,
        walletAddress: null,
        positions: [],
        options: [],
        markets: [],
        selectedMarket: null,
        currentPrice: 0,
        achievements: [],
        dailyRewards: [],
        leaderboard: [],
        showWalletModal: false,
        showPositionsPanel: true,
        showLeaderboard: false,
        showAchievements: false,
        soundEnabled: true,
        animationsEnabled: true,
        config: {
          networkType: 'ghostnet',
          rpcUrl: 'https://rpc.ghostnet.mavryk.network',
          contracts: {
            perpetuals: '',
            options: '',
            euphToken: '',
            oracle: '',
          },
          maxSlippage: 0.01,
          minCollateral: 1,
          maxCollateral: 1000,
          enableSounds: true,
          enableAnimations: true,
          chartInterval: '15m',
        },

        // User actions
        setUser: (user) => set({ user }),

        connectWallet: (address) =>
          set({
            isConnected: true,
            walletAddress: address,
          }),

        disconnectWallet: () =>
          set({
            isConnected: false,
            walletAddress: null,
            user: null,
            positions: [],
            options: [],
          }),

        // Position actions
        addPosition: (position) =>
          set((state) => ({
            positions: [...state.positions, position],
          })),

        updatePosition: (id, updates) =>
          set((state) => ({
            positions: state.positions.map((pos) =>
              pos.id === id ? { ...pos, ...updates } : pos
            ),
          })),

        removePosition: (id) =>
          set((state) => ({
            positions: state.positions.filter((pos) => pos.id !== id),
          })),

        // Option actions
        addOption: (option) =>
          set((state) => ({
            options: [...state.options, option],
          })),

        updateOption: (id, updates) =>
          set((state) => ({
            options: state.options.map((opt) =>
              opt.id === id ? { ...opt, ...updates } : opt
            ),
          })),

        // Market actions
        setMarkets: (markets) => set({ markets }),

        selectMarket: (market) =>
          set({
            selectedMarket: market,
            currentPrice: market.markPrice,
          }),

        updateMarketPrice: (marketId, price) =>
          set((state) => ({
            markets: state.markets.map((market) =>
              market.id === marketId ? { ...market, markPrice: price } : market
            ),
            currentPrice:
              state.selectedMarket?.id === marketId
                ? price
                : state.currentPrice,
          })),

        // Gamification actions
        setAchievements: (achievements) => set({ achievements }),

        unlockAchievement: (achievementId) =>
          set((state) => ({
            achievements: state.achievements.map((achievement) =>
              achievement.id === achievementId
                ? { ...achievement, unlockedAt: new Date() }
                : achievement
            ),
          })),

        setDailyRewards: (rewards) => set({ dailyRewards: rewards }),

        claimDailyReward: (day) =>
          set((state) => ({
            dailyRewards: state.dailyRewards.map((reward) =>
              reward.day === day ? { ...reward, claimed: true } : reward
            ),
          })),

        setLeaderboard: (leaderboard) => set({ leaderboard }),

        // UI actions
        toggleWalletModal: () =>
          set((state) => ({ showWalletModal: !state.showWalletModal })),

        togglePositionsPanel: () =>
          set((state) => ({ showPositionsPanel: !state.showPositionsPanel })),

        toggleLeaderboard: () =>
          set((state) => ({ showLeaderboard: !state.showLeaderboard })),

        toggleAchievements: () =>
          set((state) => ({ showAchievements: !state.showAchievements })),

        toggleSound: () =>
          set((state) => {
            const newValue = !state.soundEnabled;
            return {
              soundEnabled: newValue,
              config: { ...state.config, enableSounds: newValue },
            };
          }),

        toggleAnimations: () =>
          set((state) => {
            const newValue = !state.animationsEnabled;
            return {
              animationsEnabled: newValue,
              config: { ...state.config, enableAnimations: newValue },
            };
          }),

        setConfig: (config) =>
          set((state) => ({
            config: { ...state.config, ...config },
          })),
      }),
      {
        name: 'tapblitz-storage',
        partialize: (state) => ({
          soundEnabled: state.soundEnabled,
          animationsEnabled: state.animationsEnabled,
          config: state.config,
        }),
      }
    )
  )
);
