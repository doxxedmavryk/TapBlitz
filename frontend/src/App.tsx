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

// =============================================================================
// LOGGING
// =============================================================================

const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
} as const;

const log = (level: keyof typeof LOG_LEVELS, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [APP]`;

  if (level === 'ERROR') {
    console.error(`${prefix} ${message}`, data || '');
  } else if (level === 'WARN') {
    console.warn(`${prefix} ${message}`, data || '');
  } else {
    console.log(`${prefix} ${message}`, data || '');
  }
};

// Log app startup
log('INFO', 'TapBlitz App module loaded');
log('DEBUG', 'React environment', { nodeEnv: import.meta.env.MODE });

// Track render count
let renderCount = 0;

function App() {
  renderCount++;
  log('DEBUG', `App component rendering... (render #${renderCount})`);

  // Track store access
  log('DEBUG', 'Accessing useStore...');
  let storeData;
  try {
    storeData = useStore();
    log('DEBUG', 'useStore access successful');
  } catch (error: any) {
    log('ERROR', 'useStore access FAILED', { error: error.message, stack: error.stack });
    throw error;
  }

  const {
    isConnected,
    walletAddress,
    selectedMarket,
    markets,
    setMarkets,
    selectMarket,
    setAchievements,
    setDailyRewards,
    connectWallet,
    config,
  } = storeData;

  log('DEBUG', 'Store data extracted', {
    isConnected,
    hasSelectedMarket: !!selectedMarket,
    marketsCount: markets?.length ?? 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'perps' | 'options'>('perps');

  useEffect(() => {
    log('INFO', 'App mounted, starting initialization...');
    initializeApp();
  }, []);

  useEffect(() => {
    if (isConnected && walletAddress) {
      log('INFO', 'Wallet connected, loading user data...', { walletAddress });
      loadUserData();
    }
  }, [isConnected, walletAddress]);

  const initializeApp = async () => {
    log('INFO', '=== INITIALIZING APP ===');
    const startTime = Date.now();

    try {
      // Log config
      log('DEBUG', 'Current config', {
        networkType: config.networkType,
        rpcUrl: config.rpcUrl,
        contracts: config.contracts,
      });

      // Set contract addresses
      log('DEBUG', 'Setting contract addresses...');
      contractsService.setAddresses(config.contracts);
      log('DEBUG', 'Contract addresses set');

      // Set RPC URL
      log('DEBUG', 'Setting RPC URL...', { url: config.rpcUrl });
      walletService.setRpcUrl(config.rpcUrl);
      log('DEBUG', 'RPC URL set');

      // Load markets
      log('DEBUG', 'Generating mock markets...');
      const markets = generateMockMarkets();
      log('DEBUG', 'Markets generated', { count: markets.length });
      setMarkets(markets);
      selectMarket(markets[0]);
      log('DEBUG', 'Markets loaded and first market selected');

      // Load gamification data
      log('DEBUG', 'Loading gamification data...');
      setAchievements(generateMockAchievements());
      setDailyRewards(generateMockDailyRewards());
      log('DEBUG', 'Gamification data loaded');

      // Check for existing wallet connection
      log('DEBUG', 'Checking for existing wallet connection...');
      const activeAccount = await walletService.getActiveAccount();
      if (activeAccount) {
        log('INFO', 'Found existing wallet connection', { address: activeAccount });
        connectWallet(activeAccount);
      } else {
        log('DEBUG', 'No existing wallet connection found');
      }

      const duration = Date.now() - startTime;
      log('INFO', `=== APP INITIALIZED SUCCESSFULLY (${duration}ms) ===`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      log('ERROR', `=== APP INITIALIZATION FAILED (${duration}ms) ===`, {
        error: error.message,
        stack: error.stack,
      });
      setInitError(error.message || 'Failed to initialize app');
    } finally {
      setIsLoading(false);
      log('DEBUG', 'Loading state set to false');
    }
  };

  const loadUserData = async () => {
    if (!walletAddress) {
      log('DEBUG', 'loadUserData called but no wallet address');
      return;
    }

    log('INFO', 'Loading user data...', { walletAddress });

    try {
      // Load user positions
      log('DEBUG', 'Loading user positions...');
      const positions = await contractsService.getUserPositions(walletAddress);
      log('DEBUG', 'User positions loaded', { count: positions.length });

      // Load user options
      log('DEBUG', 'Loading user options...');
      const options = await contractsService.getUserOptions(walletAddress);
      log('DEBUG', 'User options loaded', { count: options.length });

      log('INFO', 'User data loaded successfully');
    } catch (error: any) {
      log('ERROR', 'Error loading user data', { error: error.message });
    }
  };

  // Error state
  if (initError) {
    log('ERROR', 'Rendering error state', { initError });
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <div className="text-2xl font-bold text-white mb-2">Initialization Error</div>
          <div className="text-red-400 mb-4">{initError}</div>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600"
          >
            Reload App
          </button>
          <div className="mt-4 text-sm text-slate-500">
            Check browser console for more details
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    log('DEBUG', 'Rendering loading state');
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center" style={{ minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center" style={{ textAlign: 'center' }}>
          <div className="text-6xl mb-4" style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
          <div className="text-2xl font-bold text-white mb-2" style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>TapBlitz</div>
          <div className="text-slate-400" style={{ color: '#94a3b8' }}>Loading...</div>
          <div className="mt-4 text-sm text-slate-500" style={{ marginTop: '16px', fontSize: '14px', color: '#64748b' }}>
            Initializing app - check debug panel below
          </div>
        </div>
      </div>
    );
  }

  log('DEBUG', 'Rendering main app UI');

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
              const market = markets.find((m) => m.id === Number(e.target.value));
              if (market) selectMarket(market);
            }}
          >
            {markets.map((market) => (
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
