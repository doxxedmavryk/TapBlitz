/**
 * Daily Rewards Component
 * Streak-based daily login rewards
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export const DailyRewards: React.FC = () => {
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
      });
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Daily Rewards</h3>
          <p className="text-sm text-slate-400">
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
                isClaimable && 'bg-primary-500/20 border border-primary-500 cursor-pointer animate-glow',
                isFuture && 'bg-slate-700 border border-slate-600 opacity-50'
              )}
              onClick={() => isClaimable && handleClaim(reward.day)}
            >
              {/* Day Number */}
              <div className="text-xs text-slate-400 mb-1">Day {reward.day}</div>

              {/* Icon/Status */}
              <div className="text-2xl mb-1">
                {reward.claimed ? '✅' : isClaimable ? '🎁' : '🔒'}
              </div>

              {/* Amount */}
              <div className={clsx(
                'text-xs font-bold',
                reward.claimed ? 'text-green-400' : isClaimable ? 'text-primary-400' : 'text-slate-500'
              )}>
                {reward.amount} EUPH
              </div>

              {/* Pulse animation for claimable */}
              {isClaimable && (
                <motion.div
                  className="absolute inset-0 rounded-lg border-2 border-primary-500"
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
};
