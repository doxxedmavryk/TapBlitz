/**
 * Bottom Navigation Component
 * PRD Reference: Section 4.4.2
 */

import React from 'react';

type TabType = 'trade' | 'options' | 'profile';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    {
      id: 'trade' as TabType,
      label: 'Trade',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
          />
        </svg>
      ),
      activeColor: 'text-pink-400',
      activeBg: 'bg-pink-500/20',
    },
    {
      id: 'options' as TabType,
      label: 'Options',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      activeColor: 'text-purple-400',
      activeBg: 'bg-purple-500/20',
    },
    {
      id: 'profile' as TabType,
      label: 'Profile',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
      activeColor: 'text-blue-400',
      activeBg: 'bg-blue-500/20',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1A1A1F] border-t border-gray-800 z-40 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 px-3 rounded-xl transition-all ${
                isActive ? 'scale-105' : 'scale-100'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isActive ? tab.activeBg : ''
              }`}>
                <span className={isActive ? tab.activeColor : 'text-gray-500'}>
                  {tab.icon}
                </span>
              </div>
              <span className={`text-xs font-medium transition-colors ${
                isActive ? tab.activeColor : 'text-gray-500'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
