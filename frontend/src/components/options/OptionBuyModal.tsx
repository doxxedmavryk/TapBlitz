/**
 * Option Buy Modal
 * Modal for purchasing CALL or PUT binary options
 * PRD Reference: Section 3.2, FR-BO-001
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { OptionType } from '@/types';
import { contractsService } from '@/services/contracts';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

interface OptionBuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  optionType: OptionType;
  strikePrice: number;
  currentPrice: number;
  expiryDate: Date;
  seriesId: number;
}

export const OptionBuyModal: React.FC<OptionBuyModalProps> = ({
  isOpen,
  onClose,
  optionType,
  strikePrice,
  currentPrice,
  expiryDate,
  seriesId,
}) => {
  const { walletAddress, addOption, animationsEnabled } = useStore();
  const [premium, setPremium] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);

  const isCall = optionType === OptionType.CALL;
  const potentialPayout = useMemo(() => premium * 1.95, [premium]);

  const handleBuy = async () => {
    if (!walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (premium < 0.1 || premium > 1000) {
      toast.error('Premium must be between 0.1 and 1,000 MVRK');
      return;
    }

    setIsProcessing(true);

    try {
      toast.loading('Purchasing option...', { id: 'option-toast' });

      const optionParams = {
        seriesId,
        optionType,
        strikePrice,
        premium,
      };

      await contractsService.buyOption(optionParams);

      toast.success(
        `Option purchased! ${isCall ? 'CALL' : 'PUT'} for ${premium} MVRK`,
        { id: 'option-toast', duration: 5000 }
      );

      // Trigger confetti
      if (animationsEnabled) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: isCall ? ['#10B981', '#34D399'] : ['#EF4444', '#F87171'],
        });
      }

      // Add to local state
      addOption({
        id: Date.now(),
        owner: walletAddress,
        optionType,
        strikePrice,
        premium,
        size: premium,
        marketId: 0,
        expiry: expiryDate,
        status: 'active',
        createdAt: new Date(),
      });

      onClose();
    } catch (error: any) {
      console.error('Option purchase error:', error);
      toast.error(error.message || 'Failed to purchase option', { id: 'option-toast' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMaxPremium = () => {
    setPremium(1000);
  };

  const formatTimeRemaining = () => {
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h remaining`;
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
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#1A1A1F] rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto safe-area-bottom"
          >
            {/* Handle */}
            <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6" />

            {/* Header */}
            <div className="text-center mb-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold ${
                isCall
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {isCall ? '📈 CALL' : '📉 PUT'} Option
              </div>
              <p className="text-gray-400 mt-2 text-sm">
                {isCall ? 'Price above strike at expiry' : 'Price below strike at expiry'}
              </p>
            </div>

            {/* Option Details */}
            <div className="bg-[#252530] rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Strike Price</span>
                <span className="text-white font-medium">${strikePrice.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Current Price</span>
                <span className={`font-medium ${
                  (isCall && currentPrice > strikePrice) || (!isCall && currentPrice < strikePrice)
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}>
                  ${currentPrice.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Expiry</span>
                <span className="text-white font-medium">
                  {expiryDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Time Left</span>
                <span className="text-pink-400 font-medium">{formatTimeRemaining()}</span>
              </div>
            </div>

            {/* Premium Input */}
            <div className="mb-6">
              <label className="text-gray-400 text-sm block mb-3">Premium Amount</label>
              <div className="relative">
                <input
                  type="number"
                  min={0.1}
                  max={1000}
                  step="0.1"
                  value={premium}
                  onChange={(e) => setPremium(Math.max(0.1, Number(e.target.value)))}
                  className="w-full bg-[#252530] text-white text-lg rounded-lg px-4 py-4 pr-24 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-gray-400">MVRK</span>
                  <button
                    onClick={handleMaxPremium}
                    className="text-pink-400 text-sm font-medium hover:text-pink-300"
                  >
                    MAX
                  </button>
                </div>
              </div>
              <div className="text-gray-500 text-sm mt-2">
                Min: 0.1 MVRK | Max: 1,000 MVRK
              </div>
            </div>

            {/* Payout Calculation */}
            <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-gray-400 text-sm">Potential Payout</div>
                  <div className="text-white text-2xl font-bold">
                    {potentialPayout.toFixed(2)} MVRK
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-gray-400 text-sm">Multiplier</div>
                  <div className="text-pink-400 text-xl font-bold">1.95x</div>
                </div>
              </div>
            </div>

            {/* Win Condition */}
            <div className="bg-[#252530] rounded-xl p-4 mb-6 text-center">
              <div className="text-gray-400 text-sm mb-2">You win if price is</div>
              <div className={`text-lg font-bold ${isCall ? 'text-green-400' : 'text-red-400'}`}>
                {isCall ? '>' : '<'} ${strikePrice.toFixed(4)} at expiry
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleBuy}
                disabled={isProcessing || premium < 0.1 || premium > 1000}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  isCall
                    ? 'bg-green-500 hover:bg-green-400 text-white'
                    : 'bg-red-500 hover:bg-red-400 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    Processing...
                  </span>
                ) : (
                  `Buy ${isCall ? 'CALL' : 'PUT'} for ${premium} MVRK`
                )}
              </button>

              <button
                onClick={onClose}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
