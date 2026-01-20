/**
 * Daily Rewards Component
 * Streak-based daily login rewards
 * PRD Reference: Section 5.3
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface DailyRewardsProps {
  onClose?: () => void;
}

export const DailyRewards: React.FC<DailyRewardsProps> = ({ onClose }) => {
  const { dailyRewards, claimDailyReward, user, animationsEnabled } = useStore();

  const handleClaim = (day: number) => {
    claimDailyReward(day);

    toast.success(`Claimed ${dailyRewards[day - 1]?.amount || 0} EUPH!`, {
      duration: 3000,
      icon: '🎁',
    });

    if (animationsEnabled) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#EC4899', '#8B5CF6', '#FBBF24'],
      });
    }
  };

  const content = (
    <div className="bg-[#1A1A1F] rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Daily Rewards</h3>
          <p className="text-sm text-gray-400">
            Current streak: <span className="text-orange-400 font-bold">{user?.currentStreak || 0} days</span>
          </p>
        </div>
        <div className="text-3xl">🔥</div>
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-7 gap-2">
        {dailyRewards.map((reward) => {
          const isClaimable = !reward.claimed && new Date() >= reward.claimableAt;
          const isFuture = new Date() < reward.claimableAt;

          return (
            <motion.div
              key={reward.day}
              whileHover={isClaimable ? { scale: 1.05 } : {}}
              whileTap={isClaimable ? { scale: 0.95 } : {}}
              className={clsx(
                'relative rounded-lg p-3 text-center transition-all',
                reward.claimed && 'bg-green-500/20 border border-green-500/40',
                isClaimable && 'bg-pink-500/20 border border-pink-500 cursor-pointer',
                isFuture && 'bg-[#252530] border border-gray-700 opacity-50'
              )}
              onClick={() => isClaimable && handleClaim(reward.day)}
            >
              {/* Day Number */}
              <div className="text-xs text-gray-400 mb-1">Day {reward.day}</div>

              {/* Icon/Status */}
              <div className="text-2xl mb-1">
                {reward.claimed ? '✅' : isClaimable ? '🎁' : '🔒'}
              </div>

              {/* Amount */}
              <div className={clsx(
                'text-xs font-bold',
                reward.claimed ? 'text-green-400' : isClaimable ? 'text-pink-400' : 'text-gray-500'
              )}>
                {reward.amount} EUPH
              </div>

              {/* Pulse animation for claimable */}
              {isClaimable && (
                <motion.div
                  className="absolute inset-0 rounded-lg border-2 border-pink-500"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Bonus Info */}
      <div className="mt-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-3">
        <div className="flex items-center gap-2 text-sm text-yellow-300">
          <span>⭐</span>
          <span>7-day streak bonus: <strong>+100 EUPH</strong></span>
        </div>
      </div>
    </div>
  );

  // If onClose is provided, render as a modal
  if (onClose) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute -top-3 -right-3 w-8 h-8 bg-[#252530] rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#303040] transition-colors z-10"
            >
              ✕
            </button>
            {content}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return content;
};
