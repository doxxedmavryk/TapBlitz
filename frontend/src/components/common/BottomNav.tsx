/**
 * Bottom Navigation Component - Euphoria Style
 */

import React from 'react';

interface BottomNavProps {
  activeTab: 'trade' | 'leaderboard' | 'profile';
  onTabChange: (tab: 'trade' | 'leaderboard' | 'profile') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1a0a1a] border-t border-pink-900/30 px-6 py-2 z-40">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Trade Tab */}
        <button
          onClick={() => onTabChange('trade')}
          className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
            activeTab === 'trade' ? 'bg-[#2a1a2a]' : ''
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            activeTab === 'trade' ? 'bg-pink-500/20' : ''
          }`}>
            <svg
              className={`w-6 h-6 ${activeTab === 'trade' ? 'text-pink-400' : 'text-gray-500'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
          </div>
          {activeTab === 'trade' && (
            <span className="text-xs text-pink-400">Trade</span>
          )}
        </button>

        {/* Leaderboard Tab */}
        <button
          onClick={() => onTabChange('leaderboard')}
          className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
            activeTab === 'leaderboard' ? 'bg-[#2a1a2a]' : ''
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            activeTab === 'leaderboard' ? 'bg-yellow-500/20' : ''
          }`}>
            <svg
              className={`w-6 h-6 ${activeTab === 'leaderboard' ? 'text-yellow-400' : 'text-gray-500'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          </div>
          {activeTab === 'leaderboard' && (
            <span className="text-xs text-yellow-400">Ranks</span>
          )}
        </button>

        {/* Profile Tab */}
        <button
          onClick={() => onTabChange('profile')}
          className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
            activeTab === 'profile' ? 'bg-[#2a1a2a]' : ''
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            activeTab === 'profile' ? 'bg-purple-500/20' : ''
          }`}>
            <svg
              className={`w-6 h-6 ${activeTab === 'profile' ? 'text-purple-400' : 'text-gray-500'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          {activeTab === 'profile' && (
            <span className="text-xs text-purple-400">Profile</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default BottomNav;
