/**
 * Wallet Connection Modal
 * Supports Temple, Kukai, and Umami wallets via Beacon SDK
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { walletService } from '@/services/wallet';
import toast from 'react-hot-toast';

export const WalletModal: React.FC = () => {
  const { showWalletModal, toggleWalletModal, connectWallet } = useStore();
  const [isConnecting, setIsConnecting] = useState(false);

  const wallets = [
    {
      name: 'Temple',
      icon: '🏛️',
      description: 'Most popular Tezos/Mavryk wallet',
    },
    {
      name: 'Kukai',
      icon: '🌊',
      description: 'Web-based wallet with great UX',
    },
    {
      name: 'Umami',
      icon: '🍜',
      description: 'Advanced features for power users',
    },
  ];

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      const address = await walletService.connect();
      connectWallet(address);

      toast.success(`Connected: ${address.slice(0, 8)}...${address.slice(-6)}`);
      toggleWalletModal();
    } catch (error: any) {
      console.error('Connection error:', error);
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <AnimatePresence>
      {showWalletModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={toggleWalletModal}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Connect Wallet</h2>
              <button
                onClick={toggleWalletModal}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Info */}
            <p className="text-slate-300 mb-6">
              Connect your Mavryk wallet to start trading derivatives with one tap
            </p>

            {/* Wallet Options */}
            <div className="space-y-3 mb-6">
              {wallets.map((wallet) => (
                <button
                  key={wallet.name}
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700 disabled:opacity-50
                           rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                           border border-slate-600 hover:border-primary-500"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{wallet.icon}</div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-white">{wallet.name}</div>
                      <div className="text-sm text-slate-400">{wallet.description}</div>
                    </div>
                    {isConnecting && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Disclaimer */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <div className="flex gap-2">
                <span className="text-orange-400 flex-shrink-0">⚠️</span>
                <div className="text-sm text-orange-300">
                  <strong>Risk Warning:</strong> Trading derivatives involves significant risk.
                  Only trade with funds you can afford to lose.
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
