/**
 * TapBlitz - Euphoria-style One-Tap Trading App
 */

import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store/useStore';
import { walletService } from './services/wallet';
import { contractsService } from './services/contracts';

// Components
import { TradingGrid } from './components/trading/TradingGrid';
import { BottomNav } from './components/common/BottomNav';
import { WalletModal } from './components/wallet/WalletModal';
import { Leaderboard } from './components/gamification/Leaderboard';
import { Achievements } from './components/gamification/Achievements';

// Mock data generators
import { generateMockMarkets, generateMockAchievements, generateMockDailyRewards } from './utils/mockData';

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

function App() {
  const {
    isConnected,
    walletAddress,
    setMarkets,
    selectMarket,
    setAchievements,
    setDailyRewards,
    connectWallet,
    config,
    toggleLeaderboard,
    toggleAchievements,
    toggleWalletModal,
  } = useStore();

  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trade' | 'leaderboard' | 'profile'>('trade');
  const [showSettings, setShowSettings] = useState(false);

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

      // Load markets
      const markets = generateMockMarkets();
      setMarkets(markets);
      selectMarket(markets[1]); // ETH/USD for Euphoria-style UI

      // Load gamification data
      setAchievements(generateMockAchievements());
      setDailyRewards(generateMockDailyRewards());

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

  const handleTabChange = (tab: 'trade' | 'leaderboard' | 'profile') => {
    setActiveTab(tab);
    if (tab === 'leaderboard') {
      toggleLeaderboard();
    } else if (tab === 'profile') {
      if (!isConnected) {
        toggleWalletModal();
      } else {
        toggleAchievements();
      }
    }
  };

  // Error state
  if (initError) {
    return (
      <div className="min-h-screen bg-[#1a0a1a] flex items-center justify-center">
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
      <div className="min-h-screen bg-[#1a0a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">⚡</div>
          <div className="text-2xl font-bold text-pink-500 mb-2">TapBlitz</div>
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a0a1a] text-white">
      {/* Main Trading Grid */}
      <TradingGrid onSettingsClick={() => setShowSettings(true)} />

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Modals */}
      <WalletModal />
      <Leaderboard />
      <Achievements />

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-[#1a1a2e] rounded-2xl max-w-md w-full mx-4 p-6 border border-pink-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-full bg-[#2a2a3e] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Network Info */}
              <div className="bg-[#2a2a3e] rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Network</div>
                <div className="font-medium">Mavryk Atlas Testnet</div>
              </div>

              {/* Wallet Status */}
              <div className="bg-[#2a2a3e] rounded-lg p-4">
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

              {/* Version */}
              <div className="bg-[#2a2a3e] rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Version</div>
                <div className="font-medium">1.0.0-beta</div>
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
            background: '#1a1a2e',
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
