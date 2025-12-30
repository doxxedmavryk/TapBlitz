/**
 * Interactive Trading Chart with One-Tap Trading
 * Uses Lightweight Charts library
 */

import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';
import { useStore } from '@/store/useStore';
import { RiskProfile, PositionSide } from '@/types';
import { contractsService } from '@/services/contracts';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

interface TradingChartProps {
  marketId: number;
  symbol: string;
}

export const TradingChart: React.FC<TradingChartProps> = ({ marketId, symbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const { walletAddress, selectedMarket, addPosition, soundEnabled, animationsEnabled } = useStore();
  const [riskProfile, setRiskProfile] = useState<RiskProfile>(RiskProfile.CASUAL);
  const [collateral, setCollateral] = useState(5); // Default 5 tez
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 600,
      layout: {
        background: { color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#475569',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: '#475569',
          width: 1,
          style: 2,
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1e293b',
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    candleSeriesRef.current = candleSeries;

    // Load mock data (in production, fetch from API)
    const mockData = generateMockData();
    candleSeries.setData(mockData);

    // Handle chart click for one-tap trading
    chartContainerRef.current.addEventListener('click', handleChartClick);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartContainerRef.current) {
        chartContainerRef.current.removeEventListener('click', handleChartClick);
      }
      chart.remove();
    };
  }, []);

  const generateMockData = (): CandlestickData[] => {
    const data: CandlestickData[] = [];
    let basePrice = symbol === 'BTC/USD' ? 45000 : 3000;
    const now = Date.now() / 1000;

    for (let i = 0; i < 100; i++) {
      const time = (now - (100 - i) * 15 * 60) as any; // 15-minute candles
      const change = (Math.random() - 0.5) * basePrice * 0.02;
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) + Math.random() * basePrice * 0.01;
      const low = Math.min(open, close) - Math.random() * basePrice * 0.01;

      data.push({ time, open, high, low, close });
      basePrice = close;
    }

    return data;
  };

  const handleChartClick = async (event: MouseEvent) => {
    if (!chartRef.current || !walletAddress || isProcessing) return;

    const rect = chartContainerRef.current!.getBoundingClientRect();
    const y = event.clientY - rect.top;

    // Get price at clicked Y coordinate
    const price = chartRef.current.priceScale('right').coordinateToPrice(y);
    if (!price || !selectedMarket) return;

    // Determine if it's a LONG or SHORT based on current price
    const currentPrice = selectedMarket.markPrice;
    const side = price > currentPrice ? PositionSide.LONG : PositionSide.SHORT;

    // Show confirmation toast with animation
    if (animationsEnabled) {
      const rect = chartContainerRef.current!.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;

      // Create ripple effect
      createRipple(event.clientX - rect.left, event.clientY - rect.top);
    }

    // Play sound effect
    if (soundEnabled) {
      playSound('click');
    }

    await executeTradeHandler(side, price);
  };

  const executeTradeHandler = async (side: PositionSide, targetPrice: number) => {
    if (!walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);

    try {
      const tradeParams = {
        marketId,
        side,
        riskProfile,
        targetPrice,
        collateral,
      };

      toast.loading('Opening position...', { id: 'trade-toast' });

      const opHash = await contractsService.openPosition(tradeParams);

      toast.success(
        `Position opened! ${side.toUpperCase()} @ ${targetPrice.toFixed(2)}`,
        { id: 'trade-toast', duration: 5000 }
      );

      // Trigger confetti animation
      if (animationsEnabled) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      // Play success sound
      if (soundEnabled) {
        playSound('success');
      }

      // Refresh positions
      setTimeout(async () => {
        const positions = await contractsService.getUserPositions(walletAddress);
        positions.forEach(addPosition);
      }, 2000);
    } catch (error: any) {
      console.error('Trade error:', error);
      toast.error(error.message || 'Failed to open position', { id: 'trade-toast' });

      if (soundEnabled) {
        playSound('error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const createRipple = (x: number, y: number) => {
    const ripple = document.createElement('div');
    ripple.className = 'chart-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    chartContainerRef.current?.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  };

  const playSound = (type: 'click' | 'success' | 'error') => {
    // In production, load and play actual sound files
    const audio = new Audio(`/sounds/${type}.mp3`);
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  return (
    <div className="relative">
      {/* Risk Profile Selector */}
      <div className="absolute top-4 left-4 z-10 bg-slate-800/80 backdrop-blur-sm rounded-lg p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-300">Trading Mode</div>
        <div className="flex flex-col gap-2">
          {[
            { mode: RiskProfile.CASUAL, label: 'Casual', leverage: '5x', color: 'bg-green-500' },
            { mode: RiskProfile.DEGENERATE, label: 'Degen', leverage: '20x', color: 'bg-orange-500' },
            { mode: RiskProfile.WHALE, label: 'Whale', leverage: '10x', color: 'bg-purple-500' },
          ].map(({ mode, label, leverage, color }) => (
            <button
              key={mode}
              onClick={() => setRiskProfile(mode)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                riskProfile === mode
                  ? `${color} text-white shadow-lg scale-105`
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {label} <span className="text-xs opacity-75">{leverage}</span>
            </button>
          ))}
        </div>

        {/* Collateral Input */}
        <div className="pt-3 border-t border-slate-700">
          <label className="text-sm text-slate-400 block mb-2">Collateral (tez)</label>
          <input
            type="number"
            min="1"
            max="1000"
            step="1"
            value={collateral}
            onChange={(e) => setCollateral(Number(e.target.value))}
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Click to Trade Hint */}
      <div className="absolute top-4 right-4 z-10 bg-primary-500/10 backdrop-blur-sm border border-primary-500/30 rounded-lg px-4 py-2">
        <div className="text-primary-400 text-sm font-medium">
          👆 Click anywhere to trade
        </div>
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} className="rounded-lg overflow-hidden" />

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="bg-slate-800 rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <div className="text-white font-medium">Processing trade...</div>
          </div>
        </div>
      )}

      <style>{`
        .chart-ripple {
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(14, 165, 233, 0.6);
          transform: translate(-50%, -50%);
          animation: ripple 0.6s ease-out;
          pointer-events: none;
        }

        @keyframes ripple {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
