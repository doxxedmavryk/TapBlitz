/**
 * Timeframe Selector Component
 * Allows users to switch between chart timeframes
 * PRD Reference: Section 4.3.1, FR-PC-002
 */

import React from 'react';

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

interface TimeframeSelectorProps {
  selected: Timeframe;
  onChange: (timeframe: Timeframe) => void;
}

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1D' },
];

export const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  selected,
  onChange,
}) => {
  return (
    <div className="flex items-center gap-1 bg-[#1A1A1F] rounded-lg p-1">
      {TIMEFRAMES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all min-w-[44px] ${
            selected === value
              ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25'
              : 'text-gray-400 hover:text-white hover:bg-[#252530]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
