/**
 * Header Component - Mobile-first design
 * PRD Reference: Section 4.4.1
 */

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { walletService } from '@/services/wallet';
import toast from 'react-hot-toast';

interface HeaderProps {
  onSettingsClick?: () => void;
  onRewardsClick?: () => void;
  onLeaderboardClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSettingsClick,
  onRewardsClick,
  onLeaderboardClick,
}) => {
  const {
    isConnected,
    walletAddress,
    user,
    toggleWalletModal,
    disconnectWallet,
  } = useStore();

  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    if (walletAddress) {
      loadBalance();
    }
  }, [walletAddress]);

  const loadBalance = async () => {
    if (!walletAddress) return;
    try {
      const bal = await walletService.getBalance(walletAddress);
      setBalance(bal);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

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
    <header className="sticky top-0 z-40 bg-[#0D0D0F]/95 backdrop-blur-md border-b border-gray-800">
      <div className="h-14 px-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">TapBlitz</h1>
            <p className="text-xs text-gray-500 leading-none">Mavryk</p>
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Rewards Button */}
          {isConnected && onRewardsClick && (
            <button
              onClick={onRewardsClick}
              className="w-10 h-10 rounded-full bg-[#1A1A1F] flex items-center justify-center text-xl hover:bg-[#252530] transition-colors"
              title="Daily Rewards"
            >
              🎁
            </button>
          )}

          {/* Leaderboard Button */}
          {isConnected && onLeaderboardClick && (
            <button
              onClick={onLeaderboardClick}
              className="w-10 h-10 rounded-full bg-[#1A1A1F] flex items-center justify-center text-xl hover:bg-[#252530] transition-colors"
              title="Leaderboard"
            >
              🏆
            </button>
          )}

          {/* Settings Button */}
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="w-10 h-10 rounded-full bg-[#1A1A1F] flex items-center justify-center hover:bg-[#252530] transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          )}

          {/* Wallet Button */}
          {isConnected && walletAddress ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1F] hover:bg-[#252530] rounded-lg transition-colors"
            >
              <span className="text-pink-400 font-medium">
                {balance.toFixed(2)}
              </span>
              <span className="text-gray-500 text-sm">MVRK</span>
              <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center">
                <span className="text-pink-400 text-xs">
                  {walletAddress.slice(2, 4)}
                </span>
              </div>
            </button>
          ) : (
            <button
              onClick={toggleWalletModal}
              className="px-4 py-2 bg-pink-500 hover:bg-pink-400 text-white rounded-lg font-medium transition-colors"
            >
              Connect
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
