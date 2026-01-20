/**
 * TapBlitz - One-Tap Trading Platform on Mavryk
 * PRD Reference: Main Application
 */

import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store/useStore';
import { walletService } from './services/wallet';
import { contractsService } from './services/contracts';
import { dexService } from './services/dex';
import { NETWORKS, type NetworkId } from './config/networks';

// Components
import { TradingChart } from './components/trading/TradingChart';
import { PositionsPanel } from './components/trading/PositionsPanel';
import { OptionsWeekly } from './components/options/OptionsWeekly';
import { BottomNav } from './components/common/BottomNav';
import { Header } from './components/common/Header';
import { WalletModal } from './components/wallet/WalletModal';
import { Leaderboard } from './components/gamification/Leaderboard';
import { Achievements } from './components/gamification/Achievements';
import { DailyRewards } from './components/gamification/DailyRewards';

// Mock data generators
import { generateMockMarkets, generateMockAchievements, generateMockDailyRewards, generateMockLeaderboard } from './utils/mockData';

// =============================================================================
// LOGGING
// =============================================================================

const log = (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) => {
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

log('INFO', 'TapBlitz App module loaded');

type TabType = 'trade' | 'options' | 'profile';

function App() {
  const {
    isConnected,
    walletAddress,
    setMarkets,
    selectMarket,
    setAchievements,
    setDailyRewards,
    setLeaderboard,
    connectWallet,
    config,
    currentNetwork,
    switchNetwork,
    toggleLeaderboard,
    toggleAchievements,
    toggleWalletModal,
  } = useStore();

  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('trade');
  const [showSettings, setShowSettings] = useState(false);
  const [showDailyRewards, setShowDailyRewards] = useState(false);

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
      // Set contract addresses
      contractsService.setAddresses(config.contracts);
      walletService.setRpcUrl(config.rpcUrl);

      // Load markets (MVRK/USDT only)
      const markets = generateMockMarkets();
      setMarkets(markets);
      selectMarket(markets[0]); // MVRK/USDT

      // Load gamification data
      setAchievements(generateMockAchievements());
      setDailyRewards(generateMockDailyRewards());
      setLeaderboard(generateMockLeaderboard());

      // Check for existing wallet connection
      const activeAccount = await walletService.getActiveAccount();
      if (activeAccount) {
        log('INFO', 'Found existing wallet connection', { address: activeAccount });
        connectWallet(activeAccount);
      }

      const duration = Date.now() - startTime;
      log('INFO', `=== APP INITIALIZED SUCCESSFULLY (${duration}ms) ===`);
    } catch (error: any) {
      log('ERROR', 'APP INITIALIZATION FAILED', { error: error.message });
      setInitError(error.message || 'Failed to initialize app');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserData = async () => {
    if (!walletAddress) return;

    try {
      const positions = await contractsService.getUserPositions(walletAddress);
      const options = await contractsService.getUserOptions(walletAddress);
      log('INFO', 'User data loaded', { positions: positions.length, options: options.length });
    } catch (error: any) {
      log('ERROR', 'Error loading user data', { error: error.message });
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);

    if (tab === 'profile') {
      if (!isConnected) {
        toggleWalletModal();
      } else {
        // Show achievements/profile modal
        toggleAchievements();
      }
    }
  };

  // Error state
  if (initError) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <div className="text-2xl font-bold text-white mb-2">Oops!</div>
          <div className="text-red-400 mb-4">{initError}</div>
          <button
            onClick={() => window.location.reload()}
            className="bg-pink-500 text-white px-6 py-2 rounded-lg hover:bg-pink-600"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">⚡</div>
          <div className="text-2xl font-bold text-pink-500 mb-2">TapBlitz</div>
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-white pb-20">
      {/* Header */}
      <Header
        onSettingsClick={() => setShowSettings(true)}
        onRewardsClick={() => setShowDailyRewards(true)}
        onLeaderboardClick={toggleLeaderboard}
      />

      {/* Main Content */}
      <main className="px-4 pt-4">
        {activeTab === 'trade' && (
          <div className="space-y-4">
            <TradingChart />
            <PositionsPanel />
          </div>
        )}

        {activeTab === 'options' && (
          <OptionsWeekly />
        )}

        {activeTab === 'profile' && isConnected && (
          <div className="space-y-4">
            {/* Profile content will show in achievements modal */}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Modals */}
      <WalletModal />
      <Leaderboard />
      <Achievements />
      {showDailyRewards && (
        <DailyRewards onClose={() => setShowDailyRewards(false)} />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-[#1A1A1F] rounded-2xl max-w-md w-full mx-4 p-6 border border-pink-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-full bg-[#252530] flex items-center justify-center hover:bg-[#303040]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Network Toggle */}
              <div className="bg-[#252530] rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Network</div>
                <div className="flex gap-2">
                  {Object.values(NETWORKS).map((network) => {
                    const isActive = currentNetwork === network.id;
                    return (
                      <button
                        key={network.id}
                        onClick={() => {
                          if (!isActive) {
                            switchNetwork(network.id as NetworkId);
                            walletService.setNetwork(network.id as NetworkId);
                            dexService.setNetwork(network.id as NetworkId);
                          }
                        }}
                        className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                          isActive
                            ? 'bg-pink-500 text-white'
                            : 'bg-[#1A1A1F] text-gray-400 hover:bg-[#303040]'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            isActive ? 'bg-white' : network.isTestnet ? 'bg-yellow-500' : 'bg-green-500'
                          }`}></span>
                          <span className="text-sm">{network.isTestnet ? 'Testnet' : 'Mainnet'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs text-gray-500 mt-2 text-center">
                  {NETWORKS[currentNetwork].displayName}
                  {NETWORKS[currentNetwork].isTestnet && ' (DEX Live)'}
                </div>
              </div>

              {/* Wallet Status */}
              <div className="bg-[#252530] rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Wallet</div>
                {isConnected && walletAddress ? (
                  <div className="font-medium text-green-400">
                    {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      toggleWalletModal();
                    }}
                    className="text-pink-400 hover:text-pink-300"
                  >
                    Connect Wallet
                  </button>
                )}
              </div>

              {/* Sound Toggle */}
              <div className="bg-[#252530] rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">Sound Effects</div>
                  <div className="text-sm text-gray-400">Play sounds on trades</div>
                </div>
                <button
                  onClick={() => useStore.getState().toggleSound()}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    useStore.getState().soundEnabled ? 'bg-pink-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    useStore.getState().soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Animations Toggle */}
              <div className="bg-[#252530] rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">Animations</div>
                  <div className="text-sm text-gray-400">Enable UI animations</div>
                </div>
                <button
                  onClick={() => useStore.getState().toggleAnimations()}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    useStore.getState().animationsEnabled ? 'bg-pink-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    useStore.getState().animationsEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Version */}
              <div className="bg-[#252530] rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Version</div>
                <div className="font-medium">1.0.0</div>
              </div>
            </div>

            {/* Links */}
            <div className="mt-6 flex gap-4 justify-center text-sm text-gray-400">
              <a href="#" className="hover:text-pink-400">Docs</a>
              <a href="#" className="hover:text-pink-400">Discord</a>
              <a href="#" className="hover:text-pink-400">Twitter</a>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1A1A1F',
            color: '#fff',
            borderRadius: '12px',
            border: '1px solid rgba(236, 72, 153, 0.2)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

export default App;
