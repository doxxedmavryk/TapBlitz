/**
 * Euphoria-style Grid Trading Interface for MVRK/USDT
 * Clean chart display with tap-to-trade grid
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { dexService, type PriceData } from '@/services/dex';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

interface PriceCell {
  row: number;
  col: number;
  price: number;
  multiplier: number;
  isCurrentPrice: boolean;
  isAbovePrice: boolean;
  timeLabel: string;
}

interface TradingGridProps {
  onSettingsClick: () => void;
}

export const TradingGrid: React.FC<TradingGridProps> = ({ onSettingsClick }) => {
  const {
    isConnected,
    soundEnabled,
    animationsEnabled,
    toggleWalletModal,
  } = useStore();

  const [betAmount, setBetAmount] = useState(10);
  const [balance, setBalance] = useState(98.01);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [selectedCell, setSelectedCell] = useState<PriceCell | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastWin, setLastWin] = useState<{ amount: number; show: boolean } | null>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Grid configuration
  const ROWS = 12;
  const COLS = 5;
  const PRICE_STEP = 0.0002; // MVRK price steps
  const TIME_INTERVALS = ['10s', '20s', '30s', '1m', '2m'];

  const currentPrice = priceData?.price || 0.0156;

  // Generate time labels
  const getTimeLabels = useCallback(() => {
    const now = new Date();
    return TIME_INTERVALS.map((interval) => {
      const seconds = interval.includes('m')
        ? parseInt(interval) * 60
        : parseInt(interval);
      const futureTime = new Date(now.getTime() + seconds * 1000);
      return `${futureTime.getHours().toString().padStart(2, '0')}:${futureTime.getMinutes().toString().padStart(2, '0')}:${futureTime.getSeconds().toString().padStart(2, '0')}`;
    });
  }, []);

  // Generate price cells
  const generateCells = useCallback((): PriceCell[][] => {
    const cells: PriceCell[][] = [];
    const basePrice = currentPrice;
    const halfRows = Math.floor(ROWS / 2);
    const timeLabels = getTimeLabels();

    for (let row = 0; row < ROWS; row++) {
      const rowCells: PriceCell[] = [];
      const priceOffset = (halfRows - row) * PRICE_STEP;
      const rowPrice = basePrice + priceOffset;

      for (let col = 0; col < COLS; col++) {
        const priceDistance = Math.abs(priceOffset) / PRICE_STEP;
        const timeMultiplier = 1 + (col * 0.25);
        const baseMultiplier = 1.4 + priceDistance * 0.4;
        const multiplier = Math.round(baseMultiplier * timeMultiplier * 100) / 100;

        rowCells.push({
          row,
          col,
          price: rowPrice,
          multiplier,
          isCurrentPrice: Math.abs(priceOffset) < PRICE_STEP / 2,
          isAbovePrice: priceOffset > 0,
          timeLabel: timeLabels[col],
        });
      }
      cells.push(rowCells);
    }
    return cells;
  }, [currentPrice, getTimeLabels]);

  const [cells, setCells] = useState<PriceCell[][]>(generateCells());

  // Initialize DEX price updates
  useEffect(() => {
    const initialHistory = dexService.getPriceHistory();
    setPriceHistory(initialHistory);

    const stopUpdates = dexService.startPriceUpdates(1000);

    const unsubscribe = dexService.subscribe((data) => {
      setPriceData(data);
      setPriceHistory(dexService.getPriceHistory());
    });

    // Initial fetch
    dexService.getPriceData().then(setPriceData);

    return () => {
      stopUpdates();
      unsubscribe();
    };
  }, []);

  // Update cells when price changes
  useEffect(() => {
    setCells(generateCells());
  }, [generateCells]);

  // Draw price chart
  useEffect(() => {
    const canvas = chartCanvasRef.current;
    const container = chartContainerRef.current;
    if (!canvas || !container || priceHistory.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 60, bottom: 30, left: 10 };

    // Clear canvas
    ctx.fillStyle = '#0d0615';
    ctx.fillRect(0, 0, width, height);

    // Calculate price range
    const minPrice = Math.min(...priceHistory) * 0.998;
    const maxPrice = Math.max(...priceHistory) * 1.002;
    const priceRange = maxPrice - minPrice || 0.001;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Price labels
      const price = maxPrice - (priceRange / 4) * i;
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`$${price.toFixed(4)}`, width - padding.right + 5, y + 3);
    }

    // Calculate points
    const points: { x: number; y: number }[] = priceHistory.map((price, i) => ({
      x: padding.left + (i / (priceHistory.length - 1)) * chartWidth,
      y: padding.top + ((maxPrice - price) / priceRange) * chartHeight,
    }));

    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(236, 72, 153, 0.3)');
    gradient.addColorStop(1, 'rgba(236, 72, 153, 0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
    ctx.lineTo(points[0].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw price line
    ctx.beginPath();
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Draw current price point
    const lastPoint = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ec4899';
    ctx.fill();

    // Glow effect
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Current price label
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(lastPoint.x - 35, lastPoint.y - 20, 70, 16);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`$${currentPrice.toFixed(4)}`, lastPoint.x, lastPoint.y - 8);

  }, [priceHistory, currentPrice]);

  const handleCellClick = async (cell: PriceCell) => {
    if (!isConnected) {
      toggleWalletModal();
      return;
    }

    if (isProcessing) return;
    if (balance < betAmount) {
      toast.error('Insufficient balance');
      return;
    }

    setSelectedCell(cell);
    setIsProcessing(true);

    if (soundEnabled) playSound('click');

    try {
      toast.loading(`Placing ${cell.isAbovePrice ? 'UP' : 'DOWN'} bet...`, { id: 'trade-toast' });
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const won = Math.random() < 0.65;
      const payout = won ? betAmount * cell.multiplier : 0;

      if (won) {
        setBalance((prev) => prev + payout - betAmount);
        setLastWin({ amount: payout - betAmount, show: true });

        toast.success(`You won $${(payout - betAmount).toFixed(2)}!`, {
          id: 'trade-toast',
          duration: 3000,
        });

        if (animationsEnabled) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.3 } });
        }

        if (soundEnabled) playSound('win');
        setTimeout(() => setLastWin(null), 3000);
      } else {
        setBalance((prev) => prev - betAmount);
        toast.error('Better luck next time!', { id: 'trade-toast', duration: 2000 });
        if (soundEnabled) playSound('lose');
      }
    } catch (error: any) {
      toast.error(error.message || 'Trade failed', { id: 'trade-toast' });
    } finally {
      setIsProcessing(false);
      setSelectedCell(null);
    }
  };

  const playSound = (type: 'click' | 'win' | 'lose') => {
    const frequencies: Record<string, number> = { click: 800, win: 1200, lose: 400 };
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = frequencies[type];
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {}
  };

  return (
    <div className="fixed inset-0 bg-[#0d0615] flex flex-col">
      {/* Win Notification */}
      {lastWin?.show && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-green-500/20 border border-green-500/50 rounded-full px-6 py-2 flex items-center gap-2 backdrop-blur">
            <span className="text-green-400 font-bold">+${lastWin.amount.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-purple-900/30">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            TapBlitz
          </span>
          <div className="h-4 w-px bg-purple-900/50" />
          <span className="text-sm text-gray-400">MVRK/USDT</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-purple-900/30 rounded-lg px-3 py-1.5">
            <span className={`text-lg font-mono font-bold ${(priceData?.change24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${currentPrice.toFixed(4)}
            </span>
            <span className={`text-xs ${(priceData?.change24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(priceData?.change24h || 0) >= 0 ? '▲' : '▼'} {Math.abs(priceData?.change24h || 0).toFixed(2)}%
            </span>
          </div>

          <button
            onClick={onSettingsClick}
            className="p-2 rounded-lg bg-purple-900/30 hover:bg-purple-900/50 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content - Chart and Grid side by side */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chart Area - Left side */}
        <div ref={chartContainerRef} className="w-[40%] h-full p-2">
          <canvas ref={chartCanvasRef} className="w-full h-full" />
        </div>

        {/* Grid Area - Right side */}
        <div className="flex-1 flex flex-col border-l border-purple-900/30">
          {/* Time headers */}
          <div className="flex bg-purple-900/20 border-b border-purple-900/30">
            {TIME_INTERVALS.map((time, i) => (
              <div key={i} className="flex-1 text-center text-xs text-purple-400 py-2 font-medium">
                {time}
              </div>
            ))}
            <div className="w-14" />
          </div>

          {/* Grid */}
          <div className="flex-1 relative">
            <div
              className="absolute inset-0 grid"
              style={{
                gridTemplateRows: `repeat(${ROWS}, 1fr)`,
                gridTemplateColumns: `repeat(${COLS}, 1fr) 56px`,
              }}
            >
              {cells.map((row, rowIdx) => (
                <React.Fragment key={rowIdx}>
                  {row.map((cell) => (
                    <button
                      key={`${cell.row}-${cell.col}`}
                      onClick={() => handleCellClick(cell)}
                      disabled={isProcessing}
                      className={`
                        relative border-r border-b border-purple-900/20 transition-all duration-75
                        flex items-center justify-center text-sm font-medium
                        ${cell.isCurrentPrice
                          ? 'bg-gradient-to-r from-pink-500/30 to-purple-500/30 text-white'
                          : cell.isAbovePrice
                            ? 'bg-green-900/10 text-green-400/80 hover:bg-green-500/20'
                            : 'bg-red-900/10 text-red-400/80 hover:bg-red-500/20'}
                        ${selectedCell?.row === cell.row && selectedCell?.col === cell.col
                          ? 'bg-yellow-400 text-black scale-105 z-10 font-bold'
                          : ''}
                        ${isProcessing ? 'cursor-wait' : 'cursor-pointer'}
                        active:scale-95
                      `}
                    >
                      {cell.multiplier.toFixed(2)}x
                    </button>
                  ))}
                  {/* Price label */}
                  <div className={`
                    flex items-center justify-end pr-2 text-xs font-mono border-b border-purple-900/20
                    ${row[0].isCurrentPrice ? 'text-pink-400 font-bold bg-pink-500/10' : 'text-gray-500'}
                  `}>
                    {row[0].price.toFixed(4)}
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* Current price indicator line */}
            <div
              className="absolute left-0 right-14 h-0.5 bg-gradient-to-r from-pink-500 to-purple-500 pointer-events-none z-20 shadow-lg shadow-pink-500/50"
              style={{ top: `${(ROWS / 2 / ROWS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-purple-900/20 border-t border-purple-900/30 mb-14">
        {/* Balance */}
        <div className="flex items-center gap-2 bg-purple-900/30 rounded-lg px-4 py-2">
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span className="text-white font-bold">${balance.toFixed(2)}</span>
        </div>

        {/* Bet Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBetAmount(Math.max(1, betAmount - 5))}
            className="w-9 h-9 rounded-lg bg-purple-900/30 border border-purple-700/50 text-white text-lg flex items-center justify-center hover:bg-purple-800/50 transition-colors"
          >
            −
          </button>
          <div className="flex items-center gap-1 bg-purple-900/30 rounded-lg px-4 py-2 min-w-[90px] justify-center border border-purple-700/50">
            <span className="text-white font-bold">${betAmount}</span>
          </div>
          <button
            onClick={() => setBetAmount(Math.min(balance, betAmount + 5))}
            className="w-9 h-9 rounded-lg bg-purple-900/30 border border-purple-700/50 text-white text-lg flex items-center justify-center hover:bg-purple-800/50 transition-colors"
          >
            +
          </button>
        </div>

        {/* Connect/Trade Button */}
        {!isConnected && (
          <button
            onClick={toggleWalletModal}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold hover:opacity-90 transition-opacity"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
};

export default TradingGrid;
