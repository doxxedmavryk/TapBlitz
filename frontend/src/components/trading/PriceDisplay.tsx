/**
 * Price Display Component
 * Shows current MVRK/USDT price with 24h statistics
 * PRD Reference: Section 4.3.1, FR-PC-001
 */

import React from 'react';
import { motion } from 'framer-motion';

interface PriceDisplayProps {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h?: number;
  isLoading?: boolean;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  symbol,
  price,
  change24h,
  high24h,
  low24h,
  volume24h,
  isLoading = false,
}) => {
  const isPositive = change24h >= 0;
  const changeColor = isPositive ? 'text-green-400' : 'text-red-400';
  const changeBg = isPositive ? 'bg-green-500/10' : 'bg-red-500/10';

  const formatPrice = (p: number) => {
    if (p < 1) return p.toFixed(4);
    if (p < 100) return p.toFixed(2);
    return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatVolume = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <div className="bg-[#1A1A1F] rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-24 mb-2" />
        <div className="h-8 bg-gray-700 rounded w-32 mb-3" />
        <div className="h-4 bg-gray-700 rounded w-20" />
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A1F] rounded-xl p-4">
      {/* Symbol */}
      <div className="text-gray-400 text-sm font-medium mb-1">{symbol}</div>

      {/* Price */}
      <motion.div
        key={price}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        className="flex items-baseline gap-3 mb-3"
      >
        <span className="text-white text-3xl font-bold">
          ${formatPrice(price)}
        </span>
        <span className={`px-2 py-1 rounded-md text-sm font-semibold ${changeBg} ${changeColor}`}>
          {isPositive ? '+' : ''}{change24h.toFixed(2)}%
        </span>
      </motion.div>

      {/* 24h Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-gray-500">24h H: </span>
          <span className="text-gray-300">${formatPrice(high24h)}</span>
        </div>
        <div>
          <span className="text-gray-500">24h L: </span>
          <span className="text-gray-300">${formatPrice(low24h)}</span>
        </div>
        {volume24h !== undefined && (
          <div>
            <span className="text-gray-500">Vol: </span>
            <span className="text-gray-300">{formatVolume(volume24h)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
