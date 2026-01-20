/**
 * Interactive Trading Chart with One-Tap Trading
 * Uses Lightweight Charts library
 * PRD Reference: Section 4.3.1, FR-PC-002
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineStyle } from 'lightweight-charts';
import { useStore } from '@/store/useStore';
import { PositionSide } from '@/types';
import { contractsService } from '@/services/contracts';
import { dexService, PriceData } from '@/services/dex';
import { TradeConfirmationModal } from './TradeConfirmationModal';
import { PriceDisplay } from './PriceDisplay';
import { TimeframeSelector, Timeframe } from './TimeframeSelector';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

interface TradingChartProps {
  marketId?: number;
  symbol?: string;
}

export const TradingChart: React.FC<TradingChartProps> = ({
  marketId = 0,
  symbol = 'MVRK/USDT'
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLineRef = useRef<any>(null);

  const { walletAddress, addPosition, soundEnabled, animationsEnabled } = useStore();

  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Trade confirmation modal state
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [pendingTrade, setPendingTrade] = useState<{
    side: PositionSide;
    targetPrice: number;
  } | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart with PRD dark theme
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#0D0D0F' },
        textColor: '#A1A1AA',
      },
      grid: {
        vertLines: { color: '#1A1A1F', style: LineStyle.Dotted },
        horzLines: { color: '#1A1A1F', style: LineStyle.Dotted },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#EC4899',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#EC4899',
        },
        horzLine: {
          color: '#EC4899',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#EC4899',
        },
      },
      timeScale: {
        borderColor: '#252530',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#252530',
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#EF4444',
      borderUpColor: '#10B981',
      borderDownColor: '#EF4444',
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    candleSeriesRef.current = candleSeries;

    // Handle chart click for one-tap trading
    const handleClick = (event: MouseEvent) => handleChartClick(event);
    chartContainerRef.current.addEventListener('click', handleClick);

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
      chartContainerRef.current?.removeEventListener('click', handleClick);
      chart.remove();
    };
  }, []);

  // Subscribe to price updates
  useEffect(() => {
    setIsLoading(true);

    // Initial price fetch
    dexService.getPriceData().then((data) => {
      setPriceData(data);
      setIsLoading(false);
      updateChartData(data.price);
    });

    // Subscribe to updates
    const unsubscribe = dexService.subscribe((data) => {
      setPriceData(data);
      updateChartData(data.price);
    });

    // Start real-time updates (every 5 seconds per PRD)
    const stopUpdates = dexService.startPriceUpdates(5000);

    return () => {
      unsubscribe();
      stopUpdates();
    };
  }, []);

  // Update chart with new price data
  const updateChartData = useCallback((currentPrice: number) => {
    if (!candleSeriesRef.current || !chartRef.current) return;

    // Generate candle data based on current price
    const data = generateCandleData(currentPrice, timeframe);
    candleSeriesRef.current.setData(data);

    // Update price line
    if (priceLineRef.current) {
      candleSeriesRef.current.removePriceLine(priceLineRef.current);
    }

    priceLineRef.current = candleSeriesRef.current.createPriceLine({
      price: currentPrice,
      color: '#EC4899',
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: 'Current',
    });
  }, [timeframe]);

  // Generate candle data for chart
  const generateCandleData = (currentPrice: number, tf: Timeframe): CandlestickData[] => {
    const data: CandlestickData[] = [];
    const now = Math.floor(Date.now() / 1000);

    // Timeframe in seconds
    const tfSeconds: Record<Timeframe, number> = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '4h': 14400,
      '1d': 86400,
    };

    const interval = tfSeconds[tf];
    const candleCount = 100;
    let price = currentPrice * 0.95; // Start lower for realistic chart

    for (let i = 0; i < candleCount; i++) {
      const time = (now - (candleCount - i) * interval) as any;
      const volatility = currentPrice * 0.005; // 0.5% volatility
      const trend = (currentPrice - price) / (candleCount - i) * 0.5; // Drift towards current

      const change = (Math.random() - 0.48) * volatility + trend;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;

      data.push({ time, open, high, low, close });
      price = close;
    }

    // Ensure last candle ends at current price
    if (data.length > 0) {
      const last = data[data.length - 1];
      last.close = currentPrice;
      last.high = Math.max(last.high, currentPrice);
      last.low = Math.min(last.low, currentPrice);
    }

    return data;
  };

  // Handle timeframe change
  const handleTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf);
    if (priceData) {
      updateChartData(priceData.price);
    }
  };

  // Handle chart click for tap-to-trade
  const handleChartClick = (event: MouseEvent) => {
    if (!chartRef.current || !candleSeriesRef.current || !priceData || isProcessing) return;

    const rect = chartContainerRef.current!.getBoundingClientRect();
    const y = event.clientY - rect.top;

    // Get price at clicked Y coordinate using series API
    const clickedPrice = candleSeriesRef.current.coordinateToPrice(y);
    if (clickedPrice === null) return;

    // Determine if it's a LONG or SHORT based on current price
    const currentPrice = priceData.price;
    const side = clickedPrice > currentPrice ? PositionSide.LONG : PositionSide.SHORT;

    // Show ripple effect
    if (animationsEnabled) {
      createRipple(event.clientX - rect.left, event.clientY - rect.top);
    }

    // Play click sound
    if (soundEnabled) {
      playSound('click');
    }

    // Open trade confirmation modal
    setPendingTrade({ side, targetPrice: Number(clickedPrice) });
    setShowTradeModal(true);
  };

  // Execute trade after confirmation
  const handleTradeConfirm = async (params: any) => {
    if (!walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);

    try {
      const tradeParams = {
        marketId,
        side: params.side,
        riskProfile: params.riskProfile,
        targetPrice: params.targetPrice,
        collateral: params.collateral,
      };

      toast.loading('Opening position...', { id: 'trade-toast' });

      await contractsService.openPosition(tradeParams);

      toast.success(
        `Position opened! ${params.side.toUpperCase()} @ $${params.targetPrice.toFixed(4)}`,
        { id: 'trade-toast', duration: 5000 }
      );

      // Trigger confetti animation
      if (animationsEnabled) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#EC4899', '#8B5CF6', '#10B981'],
        });
      }

      // Play success sound
      if (soundEnabled) {
        playSound('success');
      }

      setShowTradeModal(false);
      setPendingTrade(null);

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
    const audio = new Audio(`/sounds/${type}.mp3`);
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  return (
    <div className="space-y-4">
      {/* Price Display */}
      <PriceDisplay
        symbol={symbol}
        price={priceData?.price || 0}
        change24h={priceData?.change24h || 0}
        high24h={priceData?.high24h || 0}
        low24h={priceData?.low24h || 0}
        volume24h={priceData?.volume24h}
        isLoading={isLoading}
      />

      {/* Timeframe Selector */}
      <div className="flex items-center justify-between">
        <TimeframeSelector
          selected={timeframe}
          onChange={handleTimeframeChange}
        />

        {/* Tap to Trade Hint */}
        <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg px-3 py-1.5">
          <span className="text-pink-400 text-sm font-medium">
            👆 Tap chart to trade
          </span>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative">
        <div
          ref={chartContainerRef}
          className="rounded-xl overflow-hidden bg-[#0D0D0F]"
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#0D0D0F]/80 flex items-center justify-center rounded-xl">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500" />
          </div>
        )}
      </div>

      {/* Trade Confirmation Modal */}
      {pendingTrade && (
        <TradeConfirmationModal
          isOpen={showTradeModal}
          onClose={() => {
            setShowTradeModal(false);
            setPendingTrade(null);
          }}
          onConfirm={handleTradeConfirm}
          side={pendingTrade.side}
          targetPrice={pendingTrade.targetPrice}
          currentPrice={priceData?.price || 0}
          isProcessing={isProcessing}
        />
      )}

      <style>{`
        .chart-ripple {
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(236, 72, 153, 0.6);
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
