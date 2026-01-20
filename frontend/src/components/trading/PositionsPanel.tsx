/**
 * Positions Panel - Shows all open positions with P&L and liquidation warnings
 * PRD Reference: Section 3.1, FR-PF-003, FR-PF-004
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { contractsService } from '@/services/contracts';
import { dexService, PriceData } from '@/services/dex';
import { Position, MAINTENANCE_MARGIN_PERCENT } from '@/types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface PositionWithMetrics extends Position {
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  marginRatio: number;
  isLiquidationWarning: boolean;
  isLiquidationDanger: boolean;
}

export const PositionsPanel: React.FC = () => {
  const { positions, walletAddress, removePosition, soundEnabled } = useStore();
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Subscribe to real-time price updates
  useEffect(() => {
    dexService.getPriceData().then(setPriceData);

    const unsubscribe = dexService.subscribe(setPriceData);
    const stopUpdates = dexService.startPriceUpdates(5000); // Update every 5 seconds per PRD

    return () => {
      unsubscribe();
      stopUpdates();
    };
  }, []);

  const calculatePositionMetrics = (position: Position): PositionWithMetrics => {
    const currentPrice = priceData?.price || 0;

    // Calculate unrealized P&L
    let pnl = 0;
    if (position.side === 'long') {
      pnl = ((currentPrice - position.entryPrice) / position.entryPrice) * position.collateral * position.leverage;
    } else {
      pnl = ((position.entryPrice - currentPrice) / position.entryPrice) * position.collateral * position.leverage;
    }

    const pnlPercent = position.collateral > 0 ? (pnl / position.collateral) * 100 : 0;

    // Calculate margin ratio (distance to liquidation)
    // marginRatio = (collateral + pnl) / collateral
    const equity = position.collateral + pnl;
    const marginRatio = position.collateral > 0 ? equity / position.collateral : 1;

    // Warning thresholds per PRD: 20% and 15%
    const isLiquidationWarning = marginRatio <= 0.20 && marginRatio > 0.15;
    const isLiquidationDanger = marginRatio <= 0.15;

    return {
      ...position,
      currentPrice,
      pnl,
      pnlPercent,
      marginRatio,
      isLiquidationWarning,
      isLiquidationDanger,
    };
  };

  const handleClosePosition = async (positionId: number) => {
    try {
      toast.loading('Closing position...', { id: 'close-position' });

      const opHash = await contractsService.closePosition(positionId);

      toast.success('Position closed successfully!', {
        id: 'close-position',
        duration: 5000,
      });

      if (soundEnabled) {
        const audio = new Audio('/sounds/success.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      }

      removePosition(positionId);
    } catch (error: any) {
      console.error('Close position error:', error);
      toast.error(error.message || 'Failed to close position', {
        id: 'close-position',
      });
    }
  };

  const openPositions = positions
    .filter((p) => p.status === 'open')
    .map(calculatePositionMetrics);

  // Show liquidation toast for danger positions
  useEffect(() => {
    openPositions.forEach(pos => {
      if (pos.isLiquidationDanger) {
        toast.error(`Position #${pos.id} near liquidation!`, {
          id: `liq-warning-${pos.id}`,
          duration: 10000,
          icon: '⚠️',
        });
      }
    });
  }, [openPositions.filter(p => p.isLiquidationDanger).length]);

  if (openPositions.length === 0) {
    return (
      <div className="bg-[#1A1A1F] rounded-xl p-6 text-center">
        <div className="text-gray-400 mb-2">No open positions</div>
        <div className="text-sm text-gray-500">Tap on the chart to open a position</div>
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A1F] rounded-xl overflow-hidden">
      {/* Header - Collapsible */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full bg-[#252530] px-4 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className={`transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>
            ▼
          </span>
          <h3 className="text-white font-semibold">
            Open Positions ({openPositions.length})
          </h3>
        </div>
        <div className={`text-sm font-medium ${
          openPositions.some(p => p.pnl > 0) ? 'text-green-400' : 'text-red-400'
        }`}>
          {openPositions.reduce((acc, p) => acc + p.pnl, 0).toFixed(2)} MVRK
        </div>
      </button>

      {/* Positions List */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="divide-y divide-gray-800">
              {openPositions.map((position) => {
                const isProfit = position.pnl > 0;

                return (
                  <motion.div
                    key={position.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={clsx(
                      'p-4 transition-colors',
                      position.isLiquidationDanger && 'bg-red-500/10 animate-pulse',
                      position.isLiquidationWarning && 'bg-yellow-500/10'
                    )}
                  >
                    {/* Liquidation Warning Banner */}
                    {(position.isLiquidationWarning || position.isLiquidationDanger) && (
                      <div className={clsx(
                        'flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-sm font-medium',
                        position.isLiquidationDanger
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      )}>
                        <span>{position.isLiquidationDanger ? '🔴' : '⚠️'}</span>
                        <span>
                          {position.isLiquidationDanger
                            ? 'LIQUIDATION IMMINENT!'
                            : 'Liquidation warning'
                          }
                          {' '}({(position.marginRatio * 100).toFixed(1)}% margin)
                        </span>
                      </div>
                    )}

                    {/* Position Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={clsx(
                            'px-3 py-1.5 rounded-lg text-sm font-bold',
                            position.side === 'long'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          )}
                        >
                          {position.side === 'long' ? '📈' : '📉'} {position.side.toUpperCase()} {position.leverage}x
                        </div>
                        <span className="text-gray-500 text-sm">MVRK/USDT</span>
                      </div>

                      <button
                        onClick={() => handleClosePosition(position.id)}
                        className="px-4 py-1.5 bg-[#252530] hover:bg-[#303040] text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Close
                      </button>
                    </div>

                    {/* Position Details Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-[#252530] rounded-lg p-3">
                        <div className="text-gray-500 text-xs mb-1">Size</div>
                        <div className="text-white font-medium">
                          {position.size.toFixed(2)} MVRK
                        </div>
                      </div>
                      <div className="bg-[#252530] rounded-lg p-3">
                        <div className="text-gray-500 text-xs mb-1">Entry</div>
                        <div className="text-white font-medium">
                          ${position.entryPrice.toFixed(4)}
                        </div>
                      </div>
                      <div className="bg-[#252530] rounded-lg p-3">
                        <div className="text-gray-500 text-xs mb-1">Collateral</div>
                        <div className="text-white font-medium">
                          {position.collateral.toFixed(2)} MVRK
                        </div>
                      </div>
                      <div className={clsx(
                        'rounded-lg p-3',
                        position.isLiquidationDanger
                          ? 'bg-red-500/20'
                          : position.isLiquidationWarning
                          ? 'bg-yellow-500/20'
                          : 'bg-[#252530]'
                      )}>
                        <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                          Liq. Price
                          {position.isLiquidationDanger && <span className="text-red-400">⚠️</span>}
                        </div>
                        <div className={clsx(
                          'font-medium',
                          position.isLiquidationDanger
                            ? 'text-red-400'
                            : position.isLiquidationWarning
                            ? 'text-yellow-400'
                            : 'text-orange-400'
                        )}>
                          ${position.liquidationPrice.toFixed(4)}
                        </div>
                      </div>
                    </div>

                    {/* P&L Display */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                      <div className="text-gray-400 text-sm">Unrealized P&L</div>
                      <motion.div
                        key={position.pnl}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        className={clsx(
                          'font-bold text-lg',
                          isProfit ? 'text-green-400' : 'text-red-400'
                        )}
                      >
                        {isProfit ? '+' : ''}
                        {position.pnl.toFixed(2)} MVRK
                        <span className="text-sm ml-1 opacity-75">
                          ({isProfit ? '+' : ''}{position.pnlPercent.toFixed(1)}%)
                        </span>
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
