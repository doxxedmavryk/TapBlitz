/**
 * Leaderboard Component
 * Shows top traders ranked by P&L
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import clsx from 'clsx';

export const Leaderboard: React.FC = () => {
  const { leaderboard, showLeaderboard, toggleLeaderboard, walletAddress } = useStore();

  const getTrophyEmoji = (rank: number) => {
    if (rank === 1) return '🏆';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <AnimatePresence>
      {showLeaderboard && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={toggleLeaderboard}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏆</span>
                <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
              </div>
              <button
                onClick={toggleLeaderboard}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Leaderboard List */}
            <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
              {leaderboard.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <div className="text-6xl mb-4">📊</div>
                  <div className="text-lg mb-2">No traders yet</div>
                  <div className="text-sm">Be the first to make the leaderboard!</div>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {leaderboard.map((entry, index) => {
                    const isCurrentUser = entry.address === walletAddress;
                    const isTopThree = entry.rank <= 3;

                    return (
                      <motion.div
                        key={entry.address}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={clsx(
                          'p-4 transition-colors',
                          isCurrentUser && 'bg-primary-500/10',
                          isTopThree && 'bg-gradient-to-r from-yellow-500/5 to-transparent'
                        )}
                      >
                        <div className="flex items-center gap-4">
                          {/* Rank */}
                          <div
                            className={clsx(
                              'flex items-center justify-center w-12 h-12 rounded-full font-bold',
                              isTopThree
                                ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white text-xl'
                                : 'bg-slate-700 text-slate-300'
                            )}
                          >
                            {getTrophyEmoji(entry.rank)}
                          </div>

                          {/* User Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-semibold text-white">
                                {entry.displayName || `${entry.address.slice(0, 8)}...${entry.address.slice(-6)}`}
                              </div>
                              {isCurrentUser && (
                                <span className="text-xs bg-primary-500 text-white px-2 py-0.5 rounded-full">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                              <span>{entry.totalTrades} trades</span>
                              <span>{entry.winRate.toFixed(1)}% win rate</span>
                              <span>${(entry.volume / 1000).toFixed(1)}k volume</span>
                            </div>
                          </div>

                          {/* P&L */}
                          <div className="text-right">
                            <div
                              className={clsx(
                                'text-xl font-bold',
                                entry.totalPnl > 0 ? 'text-green-400' : 'text-red-400'
                              )}
                            >
                              {entry.totalPnl > 0 ? '+' : ''}
                              {entry.totalPnl.toFixed(2)} ꜩ
                            </div>
                            <div className="text-xs text-slate-400">Total P&L</div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
