/**
 * Options Portfolio Modal
 * Displays user's purchased options with claim functionality
 * PRD Reference: Section 3.2, FR-BO-002
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { contractsService } from '@/services/contracts';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

interface OptionsPortfolioProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OptionsPortfolio: React.FC<OptionsPortfolioProps> = ({
  isOpen,
  onClose,
}) => {
  const { walletAddress, options, updateOption, animationsEnabled } = useStore();

  const userOptions = useMemo(() => {
    return options
      .filter(opt => opt.owner === walletAddress)
      .sort((a, b) => {
        // Sort by status: active first, then won, then lost/expired
        const statusOrder = { active: 0, exercised: 1, expired: 2 };
        return (statusOrder[a.status as keyof typeof statusOrder] || 2) -
               (statusOrder[b.status as keyof typeof statusOrder] || 2);
      });
  }, [options, walletAddress]);

  const handleClaim = async (optionId: number) => {
    try {
      toast.loading('Claiming payout...', { id: 'claim-toast' });

      await contractsService.claimOptionPayout(optionId);

      toast.success('Payout claimed successfully!', { id: 'claim-toast', duration: 5000 });

      // Trigger confetti
      if (animationsEnabled) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10B981', '#34D399', '#FBBF24'],
        });
      }

      // Update option status
      updateOption(optionId, { status: 'exercised' });
    } catch (error: any) {
      console.error('Claim error:', error);
      toast.error(error.message || 'Failed to claim payout', { id: 'claim-toast' });
    }
  };

  const getStatusBadge = (status: string, _payout?: number) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">
            Active
          </span>
        );
      case 'exercised':
        return (
          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
            Won ✓
          </span>
        );
      case 'expired':
        return (
          <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">
            Lost
          </span>
        );
      default:
        return null;
    }
  };

  const isWinnable = (option: any) => {
    // Check if option has a payout (settled as winner)
    return option.payout && option.payout > 0 && option.status !== 'exercised';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#1A1A1F] rounded-t-2xl max-h-[80vh] overflow-hidden safe-area-bottom"
          >
            {/* Handle */}
            <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto my-4" />

            {/* Header */}
            <div className="px-6 pb-4 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">Your Options</h2>
              <p className="text-gray-400 text-sm">{userOptions.length} total positions</p>
            </div>

            {/* Options List */}
            <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-4">
              {userOptions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📊</div>
                  <div className="text-gray-400">No options purchased yet</div>
                  <div className="text-gray-500 text-sm mt-2">
                    Buy CALL or PUT options to start trading
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {userOptions.map((option) => (
                    <motion.div
                      key={option.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-[#252530] rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl ${
                            option.optionType === 'call' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {option.optionType === 'call' ? '📈' : '📉'}
                          </span>
                          <div>
                            <div className="text-white font-semibold">
                              {option.optionType.toUpperCase()} Option
                            </div>
                            <div className="text-gray-400 text-sm">
                              Strike: ${option.strikePrice.toFixed(4)}
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(option.status as string, option.payout)}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <div className="text-gray-500 text-xs">Premium Paid</div>
                          <div className="text-white font-medium">{option.premium} MVRK</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs">Potential Payout</div>
                          <div className="text-white font-medium">
                            {(option.premium * 1.95).toFixed(2)} MVRK
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-gray-500 text-xs">
                          Expires: {new Date(option.expiry).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>

                        {/* Claim Button (only for winners) */}
                        {isWinnable(option) && (
                          <button
                            onClick={() => handleClaim(option.id)}
                            className="px-4 py-2 bg-green-500 hover:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            Claim {option.payout?.toFixed(2)} MVRK
                          </button>
                        )}

                        {/* Settlement info for settled options */}
                        {option.settlementPrice && (
                          <div className="text-right">
                            <div className="text-gray-500 text-xs">Settlement</div>
                            <div className="text-white text-sm">
                              ${option.settlementPrice.toFixed(4)}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="p-4 border-t border-gray-800">
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl font-medium text-gray-400 hover:text-white bg-[#252530] hover:bg-[#303040] transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
