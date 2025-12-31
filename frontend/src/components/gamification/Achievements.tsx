/**
 * Achievements Component
 * Display unlockable achievements
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import clsx from 'clsx';

export const Achievements: React.FC = () => {
  const { achievements, showAchievements, toggleAchievements } = useStore();

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;
  const progressPercent = (unlockedCount / achievements.length) * 100;

  return (
    <AnimatePresence>
      {showAchievements && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={toggleAchievements}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🏅</span>
                  <h2 className="text-2xl font-bold text-white">Achievements</h2>
                </div>
                <button
                  onClick={toggleAchievements}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-sm text-white/90 mb-2">
                  <span>{unlockedCount} / {achievements.length} unlocked</span>
                  <span>{progressPercent.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>

            {/* Achievements Grid */}
            <div className="overflow-y-auto max-h-[calc(80vh-140px)] p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement, index) => {
                  const isUnlocked = !!achievement.unlockedAt;
                  const progressPercent = (achievement.progress / achievement.maxProgress) * 100;

                  return (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={clsx(
                        'rounded-xl p-4 transition-all',
                        isUnlocked
                          ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/40'
                          : 'bg-slate-700 border border-slate-600'
                      )}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {/* Icon */}
                        <div
                          className={clsx(
                            'text-4xl flex-shrink-0',
                            !isUnlocked && 'grayscale opacity-50'
                          )}
                        >
                          {achievement.icon}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={clsx(
                              'font-bold truncate',
                              isUnlocked ? 'text-white' : 'text-slate-400'
                            )}>
                              {achievement.name}
                            </h4>
                            {isUnlocked && <span className="text-yellow-400">✨</span>}
                          </div>
                          <p className={clsx(
                            'text-sm',
                            isUnlocked ? 'text-slate-300' : 'text-slate-500'
                          )}>
                            {achievement.description}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {!isUnlocked && (
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span>Progress</span>
                            <span>{achievement.progress} / {achievement.maxProgress}</span>
                          </div>
                          <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-primary-500 to-purple-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercent}%` }}
                              transition={{ duration: 0.5, delay: index * 0.05 }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Unlocked Date */}
                      {isUnlocked && achievement.unlockedAt && (
                        <div className="text-xs text-yellow-400/80 mt-2">
                          Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
