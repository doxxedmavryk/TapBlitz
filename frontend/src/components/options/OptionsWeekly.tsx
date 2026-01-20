/**
 * Weekly Binary Options Trading Interface
 * PRD Reference: Section 3.2, FR-BO-001
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { OptionType } from '@/types';
import { dexService, PriceData } from '@/services/dex';
import { OptionBuyModal } from './OptionBuyModal';
import { OptionsPortfolio } from './OptionsPortfolio';

interface WeeklySeries {
  id: number;
  strikePrice: number;
  expiryDate: Date;
  totalCallPremium: number;
  totalPutPremium: number;
  isSettled: boolean;
  settlementPrice?: number;
}

export const OptionsWeekly: React.FC = () => {
  const { walletAddress, options } = useStore();
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [selectedType, setSelectedType] = useState<OptionType | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);

  // Calculate next Friday 16:00 UTC for expiry
  const getNextFridayExpiry = (): Date => {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const friday = new Date(now);
    friday.setUTCDate(now.getUTCDate() + daysUntilFriday);
    friday.setUTCHours(16, 0, 0, 0);
    return friday;
  };

  // Mock weekly series (in production, fetch from contract)
  const currentSeries: WeeklySeries = useMemo(() => ({
    id: 1,
    strikePrice: priceData?.price || 0.45,
    expiryDate: getNextFridayExpiry(),
    totalCallPremium: 5000,
    totalPutPremium: 4500,
    isSettled: false,
  }), [priceData?.price]);

  // Time until expiry
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<string>('');

  useEffect(() => {
    // Subscribe to price updates
    const unsubscribe = dexService.subscribe(setPriceData);
    dexService.getPriceData().then(setPriceData);
    const stopUpdates = dexService.startPriceUpdates(5000);

    return () => {
      unsubscribe();
      stopUpdates();
    };
  }, []);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = currentSeries.expiryDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntilExpiry('Expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeUntilExpiry(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeUntilExpiry(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeUntilExpiry(`${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentSeries.expiryDate]);

  const handleOptionSelect = (type: OptionType) => {
    if (!walletAddress) {
      // Trigger wallet connect
      useStore.getState().toggleWalletModal();
      return;
    }
    setSelectedType(type);
    setShowBuyModal(true);
  };

  const userOptions = options.filter(opt => opt.owner === walletAddress);
  const activeOptions = userOptions.filter(opt => opt.status === 'active');

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">MVRK/USDT Weekly Options</h2>
        <p className="text-gray-400">Predict price direction by Friday expiry</p>
      </div>

      {/* Expiry Countdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1A1A1F] rounded-xl p-4 text-center"
      >
        <div className="text-gray-400 text-sm mb-1">Expires</div>
        <div className="text-white font-medium mb-2">
          {currentSeries.expiryDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })} 16:00 UTC
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">⏱️</span>
          <span className="text-pink-400 text-2xl font-bold">{timeUntilExpiry}</span>
        </div>
      </motion.div>

      {/* Strike & Current Price */}
      <div className="bg-[#1A1A1F] rounded-xl p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-gray-400 text-sm mb-1">Strike Price</div>
            <div className="text-white text-xl font-bold">
              ${currentSeries.strikePrice.toFixed(4)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-sm mb-1">Current Price</div>
            <div className={`text-xl font-bold ${
              priceData && priceData.price > currentSeries.strikePrice
                ? 'text-green-400'
                : 'text-red-400'
            }`}>
              ${priceData?.price.toFixed(4) || '---'}
            </div>
          </div>
        </div>

        {/* Price difference indicator */}
        {priceData && (
          <div className="mt-4 text-center">
            <span className={`text-sm ${
              priceData.price > currentSeries.strikePrice
                ? 'text-green-400'
                : 'text-red-400'
            }`}>
              {priceData.price > currentSeries.strikePrice ? '📈' : '📉'}{' '}
              {((priceData.price - currentSeries.strikePrice) / currentSeries.strikePrice * 100).toFixed(2)}%
              {priceData.price > currentSeries.strikePrice ? ' above' : ' below'} strike
            </span>
          </div>
        )}
      </div>

      {/* CALL / PUT Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleOptionSelect(OptionType.CALL)}
          className="bg-gradient-to-b from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white rounded-2xl p-6 transition-all shadow-lg shadow-green-500/25"
        >
          <div className="text-4xl mb-2">📈</div>
          <div className="text-xl font-bold mb-1">CALL</div>
          <div className="text-sm opacity-80">Price Up</div>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleOptionSelect(OptionType.PUT)}
          className="bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white rounded-2xl p-6 transition-all shadow-lg shadow-red-500/25"
        >
          <div className="text-4xl mb-2">📉</div>
          <div className="text-xl font-bold mb-1">PUT</div>
          <div className="text-sm opacity-80">Price Down</div>
        </motion.button>
      </div>

      {/* Payout Info */}
      <div className="bg-[#252530] rounded-xl p-4 text-center">
        <div className="text-gray-400 text-sm mb-1">Potential Payout</div>
        <div className="text-white text-lg font-bold">1.95x</div>
        <div className="text-gray-500 text-xs">5% platform fee included</div>
      </div>

      {/* User's Options */}
      {activeOptions.length > 0 && (
        <div className="bg-[#1A1A1F] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Your Options ({activeOptions.length})</h3>
            <button
              onClick={() => setShowPortfolio(true)}
              className="text-pink-400 text-sm hover:text-pink-300"
            >
              View All →
            </button>
          </div>

          <div className="space-y-2">
            {activeOptions.slice(0, 3).map((option) => (
              <div
                key={option.id}
                className="flex items-center justify-between bg-[#252530] rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-lg ${
                    option.optionType === 'call' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {option.optionType === 'call' ? '📈' : '📉'}
                  </span>
                  <div>
                    <div className="text-white font-medium">
                      {option.optionType.toUpperCase()}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {option.premium} MVRK
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-gray-400 text-sm">Payout</div>
                  <div className="text-white font-medium">
                    {(option.premium * 1.95).toFixed(2)} MVRK
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buy Modal */}
      {selectedType && (
        <OptionBuyModal
          isOpen={showBuyModal}
          onClose={() => {
            setShowBuyModal(false);
            setSelectedType(null);
          }}
          optionType={selectedType}
          strikePrice={currentSeries.strikePrice}
          currentPrice={priceData?.price || 0}
          expiryDate={currentSeries.expiryDate}
          seriesId={currentSeries.id}
        />
      )}

      {/* Portfolio Modal */}
      <OptionsPortfolio
        isOpen={showPortfolio}
        onClose={() => setShowPortfolio(false)}
      />
    </div>
  );
};
