/**
 * Main Header/Navigation Component
 */

import { useStore } from '@/store/useStore';
import { walletService } from '@/services/wallet';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export const Header: React.FC = () => {
  const {
    isConnected,
    walletAddress,
    user,
    toggleWalletModal,
    toggleLeaderboard,
    toggleAchievements,
    toggleSound,
    toggleAnimations,
    soundEnabled,
    animationsEnabled,
    disconnectWallet,
  } = useStore();

  const handleDisconnect = async () => {
    try {
      await walletService.disconnect();
      disconnectWallet();
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="text-3xl">⚡</div>
            <div>
              <h1 className="text-xl font-bold text-white">TapBlitz</h1>
              <p className="text-xs text-slate-400">Powered by Mavryk</p>
            </div>
          </div>

          {/* Center - User Stats (if connected) */}
          {isConnected && user && (
            <div className="hidden md:flex items-center gap-6">
              <div className="text-center">
                <div className="text-sm text-slate-400">Total P&L</div>
                <div className={clsx(
                  'text-lg font-bold',
                  user.totalPnl > 0 ? 'text-green-400' : 'text-red-400'
                )}>
                  {user.totalPnl > 0 ? '+' : ''}{user.totalPnl.toFixed(2)} ꜩ
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-slate-400">Win Rate</div>
                <div className="text-lg font-bold text-white">
                  {user.winRate.toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-slate-400">Streak</div>
                <div className="text-lg font-bold text-orange-400">
                  🔥 {user.currentStreak}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-slate-400">Level</div>
                <div className="text-lg font-bold text-purple-400">
                  {user.level}
                </div>
              </div>
            </div>
          )}

          {/* Right - Actions */}
          <div className="flex items-center gap-3">
            {/* Settings */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSound}
                className={clsx(
                  'p-2 rounded-lg transition-colors',
                  soundEnabled ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500'
                )}
                title={soundEnabled ? 'Sound On' : 'Sound Off'}
              >
                {soundEnabled ? '🔊' : '🔇'}
              </button>
              <button
                onClick={toggleAnimations}
                className={clsx(
                  'p-2 rounded-lg transition-colors',
                  animationsEnabled ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500'
                )}
                title={animationsEnabled ? 'Animations On' : 'Animations Off'}
              >
                {animationsEnabled ? '✨' : '💤'}
              </button>
            </div>

            {/* Gamification Buttons */}
            {isConnected && (
              <>
                <button
                  onClick={toggleLeaderboard}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white rounded-lg font-medium transition-all hover:scale-105"
                >
                  🏆 Leaderboard
                </button>
                <button
                  onClick={toggleAchievements}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-medium transition-all hover:scale-105"
                >
                  🏅 Achievements
                </button>
              </>
            )}

            {/* Wallet Button */}
            {isConnected && walletAddress ? (
              <div className="relative group">
                <button className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-all">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </button>

                {/* Dropdown */}
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="p-3 border-b border-slate-700">
                    <div className="text-xs text-slate-400">Balance</div>
                    <div className="text-white font-bold">{user?.balance.toFixed(2) || '0.00'} ꜩ</div>
                    <div className="text-xs text-slate-400 mt-1">EUPH: {user?.euphBalance.toFixed(0) || '0'}</div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="w-full px-3 py-2 text-left text-red-400 hover:bg-slate-700 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={toggleWalletModal}
                className="px-6 py-2 bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-600 hover:to-purple-600 text-white rounded-lg font-bold transition-all hover:scale-105 shadow-lg"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
