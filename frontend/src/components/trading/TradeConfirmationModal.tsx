/**
 * Trade Confirmation Modal
 * Displays trade details and allows user to confirm or cancel
 * PRD Reference: Section 4.3.2
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { RiskProfile, PositionSide, RISK_PROFILE_LEVERAGE, TRADING_FEE_PERCENT } from '@/types';

interface TradeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (params: TradeParams) => void;
  side: PositionSide;
  targetPrice: number;
  currentPrice: number;
  isProcessing?: boolean;
}

interface TradeParams {
  side: PositionSide;
  riskProfile: RiskProfile;
  targetPrice: number;
  collateral: number;
  leverage: number;
  positionSize: number;
  liquidationPrice: number;
  tradingFee: number;
}

export const TradeConfirmationModal: React.FC<TradeConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  side,
  targetPrice,
  currentPrice,
  isProcessing = false,
}) => {
  const { config } = useStore();
  const [riskProfile, setRiskProfile] = useState<RiskProfile>(RiskProfile.CASUAL);
  const [collateral, setCollateral] = useState(10);

  const leverage = RISK_PROFILE_LEVERAGE[riskProfile];

  // Calculate position details
  const calculations = useMemo(() => {
    const positionSize = collateral * leverage;
    const tradingFee = positionSize * TRADING_FEE_PERCENT;

    // Liquidation price calculation
    // For LONG: liquidation when price drops enough that loss = collateral
    // For SHORT: liquidation when price rises enough that loss = collateral
    const liquidationDistance = collateral / positionSize;
    const liquidationPrice = side === PositionSide.LONG
      ? currentPrice * (1 - liquidationDistance * 0.9) // 90% = maintenance margin
      : currentPrice * (1 + liquidationDistance * 0.9);

    return {
      positionSize,
      tradingFee,
      liquidationPrice,
      leverage,
    };
  }, [collateral, leverage, currentPrice, side]);

  const handleConfirm = () => {
    onConfirm({
      side,
      riskProfile,
      targetPrice,
      collateral,
      leverage: calculations.leverage,
      positionSize: calculations.positionSize,
      liquidationPrice: calculations.liquidationPrice,
      tradingFee: calculations.tradingFee,
    });
  };

  const handleMaxCollateral = () => {
    setCollateral(config.maxCollateral);
  };

  const riskProfiles = [
    { profile: RiskProfile.CASUAL, label: 'Casual', leverage: 5 },
    { profile: RiskProfile.DEGENERATE, label: 'Degen', leverage: 20 },
    { profile: RiskProfile.WHALE, label: 'Whale', leverage: 10 },
  ];

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
                side === PositionSide.LONG
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {side === PositionSide.LONG ? '📈 LONG' : '📉 SHORT'} MVRK
              </div>
            </div>

            {/* Price Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#252530] rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Entry Price</div>
                <div className="text-white text-xl font-bold">${targetPrice.toFixed(4)}</div>
              </div>
              <div className="bg-[#252530] rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Current Price</div>
                <div className="text-white text-xl font-bold">${currentPrice.toFixed(4)}</div>
              </div>
            </div>

            {/* Risk Profile Selector */}
            <div className="mb-6">
              <label className="text-gray-400 text-sm block mb-3">Risk Profile</label>
              <div className="grid grid-cols-3 gap-2">
                {riskProfiles.map(({ profile, label, leverage }) => (
                  <button
                    key={profile}
                    onClick={() => setRiskProfile(profile)}
                    className={`py-3 px-4 rounded-lg font-medium transition-all ${
                      riskProfile === profile
                        ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25'
                        : 'bg-[#252530] text-gray-300 hover:bg-[#303040]'
                    }`}
                  >
                    <div className="text-sm">{label}</div>
                    <div className="text-xs opacity-75">{leverage}x</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Collateral Input */}
            <div className="mb-6">
              <label className="text-gray-400 text-sm block mb-3">Collateral</label>
              <div className="relative">
                <input
                  type="number"
                  min={config.minCollateral}
                  max={config.maxCollateral}
                  step="1"
                  value={collateral}
                  onChange={(e) => setCollateral(Math.max(config.minCollateral, Number(e.target.value)))}
                  className="w-full bg-[#252530] text-white text-lg rounded-lg px-4 py-4 pr-24 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-gray-400">MVRK</span>
                  <button
                    onClick={handleMaxCollateral}
                    className="text-pink-400 text-sm font-medium hover:text-pink-300"
                  >
                    MAX
                  </button>
                </div>
              </div>
              <div className="text-gray-500 text-sm mt-2">
                Min: {config.minCollateral} MVRK
              </div>
            </div>

            {/* Calculation Summary */}
            <div className="bg-[#252530] rounded-lg p-4 mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Position Size</span>
                <span className="text-white font-medium">
                  {calculations.positionSize.toFixed(2)} MVRK
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Leverage</span>
                <span className="text-white font-medium">{leverage}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Liquidation Price</span>
                <span className={`font-medium ${
                  side === PositionSide.LONG ? 'text-red-400' : 'text-red-400'
                }`}>
                  ${calculations.liquidationPrice.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-700 pt-3">
                <span className="text-gray-400">Trading Fee (0.3%)</span>
                <span className="text-gray-300">
                  {calculations.tradingFee.toFixed(4)} MVRK
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleConfirm}
                disabled={isProcessing || collateral < config.minCollateral}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  side === PositionSide.LONG
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
                  `Confirm ${side === PositionSide.LONG ? 'Long' : 'Short'}`
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
