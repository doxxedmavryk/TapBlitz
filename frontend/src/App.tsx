/**
 * Main TapBlitz Application Component
 */

import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store/useStore';
import { walletService } from './services/wallet';
import { contractsService } from './services/contracts';

// Components
import { Header } from './components/common/Header';
import { TradingChart } from './components/trading/TradingChart';
import { PositionsPanel } from './components/trading/PositionsPanel';
import { WalletModal } from './components/wallet/WalletModal';
import { Leaderboard } from './components/gamification/Leaderboard';
import { Achievements } from './components/gamification/Achievements';
import { DailyRewards } from './components/gamification/DailyRewards';

// Mock data generators
import { generateMockMarkets, generateMockAchievements, generateMockDailyRewards } from './utils/mockData';

function App() {
  const {
    isConnected,
    walletAddress,
    selectedMarket,
    setMarkets,
    selectMarket,
    setAchievements,
    setDailyRewards,
    connectWallet,
    config,
  } = useStore();

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'perps' | 'options'>('perps');

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (isConnected && walletAddress) {
      loadUserData();
    }
  }, [isConnected, walletAddress]);

  const initializeApp = async () => {
    try {
      // Set contract addresses
      contractsService.setAddresses(config.contracts);

      // Set RPC URL
      walletService.setRpcUrl(config.rpcUrl);

      // Load markets
      const markets = generateMockMarkets();
      setMarkets(markets);
      selectMarket(markets[0]);

      // Load gamification data
      setAchievements(generateMockAchievements());
      setDailyRewards(generateMockDailyRewards());

      // Check for existing wallet connection
      const activeAccount = await walletService.getActiveAccount();
      if (activeAccount) {
        connectWallet(activeAccount);
      }
    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserData = async () => {
    if (!walletAddress) return;

    try {
      // Load user positions
      const positions = await contractsService.getUserPositions(walletAddress);
      // Load user options
      const options = await contractsService.getUserOptions(walletAddress);

      // In production, fetch user stats from backend API
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚡</div>
          <div className="text-2xl font-bold text-white mb-2">TapBlitz</div>
          <div className="text-slate-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Market Selector */}
        <div className="flex items-center gap-4 mb-6">
          <select
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={selectedMarket?.id || 0}
            onChange={(e) => {
              const market = useStore.getState().markets.find((m) => m.id === Number(e.target.value));
              if (market) selectMarket(market);
            }}
          >
            {useStore.getState().markets.map((market) => (
              <option key={market.id} value={market.id}>
                {market.symbol}
              </option>
            ))}
          </select>

          {selectedMarket && (
            <div className="flex items-center gap-6">
              <div>
                <div className="text-2xl font-bold text-white">
                  ${selectedMarket.markPrice.toLocaleString()}
                </div>
                <div className="text-sm text-slate-400">{selectedMarket.symbol}</div>
              </div>
              {selectedMarket.change24h !== undefined && (
                <div className={`text-lg font-bold ${selectedMarket.change24h > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {selectedMarket.change24h > 0 ? '+' : ''}
                  {selectedMarket.change24h.toFixed(2)}%
                </div>
              )}
            </div>
          )}
        </div>

        {/* Product Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('perps')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'perps'
                ? 'bg-primary-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Perpetuals
          </button>
          <button
            onClick={() => setActiveTab('options')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'options'
                ? 'bg-primary-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Binary Options
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left - Chart (2/3 width) */}
          <div className="lg:col-span-2">
            {selectedMarket && (
              <TradingChart marketId={selectedMarket.id} symbol={selectedMarket.symbol} />
            )}
          </div>

          {/* Right - Positions & Rewards (1/3 width) */}
          <div className="space-y-6">
            {isConnected && <DailyRewards />}
            <PositionsPanel />
          </div>
        </div>
      </main>

      {/* Modals */}
      <WalletModal />
      <Leaderboard />
      <Achievements />

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'bg-slate-800 text-white',
          style: {
            background: '#1e293b',
            color: '#fff',
            borderRadius: '12px',
            padding: '16px',
          },
        }}
      />
    </div>
  );
}

export default App;
