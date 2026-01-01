/**
 * Wallet Connection Modal
 * Supports Mavryk Wallet, Temple, and other Beacon-compatible wallets
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { walletService } from '@/services/wallet';
import toast from 'react-hot-toast';

export const WalletModal: React.FC = () => {
  const { showWalletModal, toggleWalletModal, connectWallet } = useStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);

  const wallets = [
    {
      id: 'mavryk',
      name: 'Mavryk Wallet',
      icon: '🔷',
      color: 'from-blue-500 to-cyan-500',
      description: 'Official Mavryk network wallet',
      recommended: true,
    },
    {
      id: 'temple',
      name: 'Temple Wallet',
      icon: '🏛️',
      color: 'from-purple-500 to-pink-500',
      description: 'Popular Tezos/Mavryk browser extension',
      recommended: false,
    },
    {
      id: 'kukai',
      name: 'Kukai Wallet',
      icon: '🌊',
      color: 'from-cyan-500 to-blue-500',
      description: 'Web-based wallet with social login',
      recommended: false,
    },
  ];

  const handleConnect = async (walletId: string) => {
    setIsConnecting(true);
    setConnectingWallet(walletId);

    try {
      toast.loading('Connecting to wallet...', { id: 'wallet-connect' });

      // All wallets use Beacon SDK - the user will choose their wallet in the Beacon popup
      const address = await walletService.connect();

      if (address) {
        connectWallet(address);
        toast.success(`Connected: ${address.slice(0, 8)}...${address.slice(-4)}`, {
          id: 'wallet-connect',
          duration: 3000,
        });
        toggleWalletModal();
      }
    } catch (error: any) {
      console.error('Connection error:', error);

      let errorMessage = 'Failed to connect wallet';
      if (error.message?.includes('Aborted')) {
        errorMessage = 'Connection cancelled by user';
      } else if (error.message?.includes('No permission')) {
        errorMessage = 'Please approve the connection in your wallet';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { id: 'wallet-connect' });
    } finally {
      setIsConnecting(false);
      setConnectingWallet(null);
    }
  };

  return (
    <AnimatePresence>
      {showWalletModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={toggleWalletModal}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-[#1a1a2e] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-pink-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Connect Wallet</h2>
              <button
                onClick={toggleWalletModal}
                className="w-8 h-8 rounded-full bg-[#2a2a3e] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Description */}
            <p className="text-gray-400 mb-6 text-sm">
              Connect your wallet to start trading on TapBlitz. All wallets use the secure Beacon protocol.
            </p>

            {/* Wallet Options */}
            <div className="space-y-3 mb-6">
              {wallets.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleConnect(wallet.id)}
                  disabled={isConnecting}
                  className={`
                    w-full rounded-xl p-4 transition-all duration-200
                    ${isConnecting && connectingWallet !== wallet.id ? 'opacity-50' : ''}
                    ${wallet.recommended
                      ? 'bg-gradient-to-r ' + wallet.color + ' hover:opacity-90'
                      : 'bg-[#2a2a3e] hover:bg-[#3a3a4e]'
                    }
                    border border-transparent hover:border-pink-500/30
                    disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className={`
                      w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                      ${wallet.recommended ? 'bg-white/20' : 'bg-[#1a1a2e]'}
                    `}>
                      {wallet.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${wallet.recommended ? 'text-white' : 'text-white'}`}>
                          {wallet.name}
                        </span>
                        {wallet.recommended && (
                          <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className={`text-sm ${wallet.recommended ? 'text-white/70' : 'text-gray-400'}`}>
                        {wallet.description}
                      </div>
                    </div>
                    {isConnecting && connectingWallet === wallet.id ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <svg className={`w-5 h-5 ${wallet.recommended ? 'text-white' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Install Wallet Link */}
            <div className="text-center mb-4">
              <a
                href="https://mavryk.org/wallet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-400 hover:text-pink-300 text-sm inline-flex items-center gap-1"
              >
                Don't have a wallet? Get Mavryk Wallet
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {/* Risk Warning */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
              <div className="flex gap-2">
                <span className="text-orange-400 flex-shrink-0">⚠️</span>
                <p className="text-xs text-orange-300/80">
                  <strong>Risk Warning:</strong> Trading derivatives involves significant risk.
                  Only trade with funds you can afford to lose.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
