/**
 * Positions Panel - Shows all open positions with P&L
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { contractsService } from '@/services/contracts';
import { Position } from '@/types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export const PositionsPanel: React.FC = () => {
  const { positions, walletAddress, selectedMarket, removePosition, soundEnabled } = useStore();

  const calculateUnrealizedPnL = (position: Position): { pnl: number; pnlPercent: number } => {
    if (!selectedMarket) return { pnl: 0, pnlPercent: 0 };

    const currentPrice = selectedMarket.markPrice;
    let pnl = 0;

    if (position.side === 'long') {
      pnl = ((currentPrice - position.entryPrice) / position.entryPrice) * position.collateral * position.leverage;
    } else {
      pnl = ((position.entryPrice - currentPrice) / position.entryPrice) * position.collateral * position.leverage;
    }

    const pnlPercent = (pnl / position.collateral) * 100;

    return { pnl, pnlPercent };
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

  const openPositions = positions.filter((p) => p.status === 'open');

  if (openPositions.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 text-center">
        <div className="text-slate-400 mb-2">No open positions</div>
        <div className="text-sm text-slate-500">Click on the chart to open a position</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <div className="bg-slate-900 px-6 py-4 border-b border-slate-700">
        <h3 className="text-lg font-bold text-white">
          Open Positions ({openPositions.length})
        </h3>
      </div>

      <div className="divide-y divide-slate-700">
        {openPositions.map((position) => {
          const { pnl, pnlPercent } = calculateUnrealizedPnL(position);
          const isProfit = pnl > 0;

          return (
            <motion.div
              key={position.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      'px-3 py-1 rounded-full text-xs font-bold',
                      position.side === 'long'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    )}
                  >
                    {position.side.toUpperCase()} {position.leverage}x
                  </div>
                  <div className="text-sm text-slate-400">
                    #{position.id}
                  </div>
                </div>

                <button
                  onClick={() => handleClosePosition(position.id)}
                  className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Entry Price</div>
                  <div className="text-white font-medium">
                    ${position.entryPrice.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Liq. Price</div>
                  <div className="text-orange-400 font-medium">
                    ${position.liquidationPrice.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Size</div>
                  <div className="text-white font-medium">
                    ${position.size.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Collateral</div>
                  <div className="text-white font-medium">
                    {position.collateral.toFixed(2)} ꜩ
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                <div className="text-xs text-slate-400">Unrealized P&L</div>
                <div
                  className={clsx(
                    'font-bold text-lg',
                    isProfit ? 'text-green-400' : 'text-red-400'
                  )}
                >
                  {isProfit ? '+' : ''}
                  {pnl.toFixed(2)} ꜩ ({isProfit ? '+' : ''}
                  {pnlPercent.toFixed(2)}%)
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
