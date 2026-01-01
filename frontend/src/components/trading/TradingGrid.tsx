/**
 * Euphoria-style Grid Trading Interface
 * Tap on cells to place trades at different price levels
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
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
    selectedMarket,
    walletAddress,
    isConnected,
    soundEnabled,
    animationsEnabled,
    toggleWalletModal,
  } = useStore();

  const [betAmount, setBetAmount] = useState(10);
  const [balance, setBalance] = useState(98.01);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [currentPrice, setCurrentPrice] = useState(selectedMarket?.markPrice || 3000);
  const [selectedCell, setSelectedCell] = useState<PriceCell | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastWin, setLastWin] = useState<{ amount: number; show: boolean } | null>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);

  // Grid configuration
  const ROWS = 14;
  const COLS = 5;
  const PRICE_STEP = selectedMarket?.symbol === 'BTC/USD' ? 100 : 0.5;
  const TIME_INTERVALS = ['10s', '20s', '30s', '1m', '2m'];

  // Generate time labels based on current time
  const getTimeLabels = useCallback(() => {
    const now = new Date();
    return TIME_INTERVALS.map((interval, i) => {
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
        const timeMultiplier = 1 + (col * 0.3);
        const baseMultiplier = 1.5 + priceDistance * 0.5;
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
  }, [currentPrice, PRICE_STEP, getTimeLabels]);

  const [cells, setCells] = useState<PriceCell[][]>(generateCells());

  // Update cells when price changes
  useEffect(() => {
    setCells(generateCells());
  }, [generateCells]);

  // Simulate price movement and build history
  useEffect(() => {
    // Initialize price history
    const initHistory: number[] = [];
    let price = currentPrice;
    for (let i = 0; i < 100; i++) {
      price += (Math.random() - 0.5) * PRICE_STEP * 0.4;
      initHistory.push(price);
    }
    setPriceHistory(initHistory);

    const interval = setInterval(() => {
      setCurrentPrice((prev) => {
        const change = (Math.random() - 0.5) * PRICE_STEP * 0.3;
        const newPrice = prev + change;
        setPriceHistory((history) => [...history.slice(-99), newPrice]);
        return newPrice;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Draw price line chart
  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas || priceHistory.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate price range
    const minPrice = Math.min(...priceHistory) - PRICE_STEP;
    const maxPrice = Math.max(...priceHistory) + PRICE_STEP;
    const priceRange = maxPrice - minPrice || 1;

    // Draw gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, 'rgba(236, 72, 153, 0.1)');
    bgGradient.addColorStop(1, 'rgba(236, 72, 153, 0)');

    // Draw price line
    ctx.beginPath();
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points: { x: number; y: number }[] = [];

    priceHistory.forEach((price, i) => {
      const x = (i / (priceHistory.length - 1)) * width;
      const y = height - ((price - minPrice) / priceRange) * height * 0.85 - height * 0.075;
      points.push({ x, y });

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw fill under the line
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = bgGradient;
    ctx.fill();

    // Draw current price dot
    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ec4899';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [priceHistory, PRICE_STEP]);

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

    if (soundEnabled) {
      playSound('click');
    }

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
    <div className="fixed inset-0 bg-[#12061a] flex flex-col overflow-hidden">
      {/* Win Notification */}
      {lastWin?.show && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-[#1a1a2e] border border-green-500/30 rounded-full px-6 py-3 flex items-center gap-2 shadow-lg">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-white font-semibold">You won ${lastWin.amount.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 z-10">
        <div className="text-2xl font-bold text-pink-500">euph</div>
        <div className="flex items-center gap-2 bg-[#1a1525] rounded-full px-4 py-2 border border-pink-900/30">
          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-400 to-purple-500" />
          <span className="text-green-400 font-bold text-lg">{currentPrice.toFixed(2)}</span>
        </div>
        <button
          onClick={onSettingsClick}
          className="w-10 h-10 rounded-full bg-[#1a1525] border border-pink-900/30 flex items-center justify-center"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Chart Area - Left 35% */}
        <div className="w-[35%] relative p-2">
          <canvas
            ref={chartCanvasRef}
            className="w-full h-full"
            style={{ display: 'block' }}
          />
          {/* Win indicator on chart */}
          {lastWin && (
            <div className="absolute left-4 top-1/3 text-green-400 font-bold text-xl animate-pulse">
              +${lastWin.amount.toFixed(2)}
            </div>
          )}
        </div>

        {/* Grid Area - Right 65% */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Time headers */}
          <div className="flex border-b border-pink-900/30">
            {TIME_INTERVALS.map((time, i) => (
              <div key={i} className="flex-1 text-center text-xs text-gray-500 py-1">
                {time}
              </div>
            ))}
            <div className="w-16" /> {/* Space for price labels */}
          </div>

          {/* Grid */}
          <div className="flex-1 relative overflow-hidden">
            <div
              className="absolute inset-0 grid"
              style={{
                gridTemplateRows: `repeat(${ROWS}, 1fr)`,
                gridTemplateColumns: `repeat(${COLS}, 1fr) 60px`,
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
                        relative border-r border-b border-pink-900/20 transition-all duration-100
                        flex items-center justify-center
                        ${cell.isCurrentPrice ? 'bg-pink-500/30' : 'hover:bg-pink-500/10'}
                        ${selectedCell?.row === cell.row && selectedCell?.col === cell.col
                          ? 'bg-yellow-400 scale-105 z-10' : ''}
                        ${isProcessing ? 'cursor-wait' : 'cursor-pointer'}
                        active:scale-95
                      `}
                    >
                      <span className={`
                        text-sm font-medium
                        ${cell.isCurrentPrice ? 'text-pink-300' : 'text-pink-600/80'}
                        ${selectedCell?.row === cell.row && selectedCell?.col === cell.col
                          ? 'text-black font-bold' : ''}
                      `}>
                        {cell.multiplier.toFixed(2)}x
                      </span>
                    </button>
                  ))}
                  {/* Price label */}
                  <div className={`
                    flex items-center justify-end pr-2 text-xs border-b border-pink-900/20
                    ${row[0].isCurrentPrice ? 'text-pink-400 font-bold' : 'text-gray-600'}
                  `}>
                    ${row[0].price.toFixed(1)}
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* Current price line */}
            <div
              className="absolute left-0 right-16 h-0.5 bg-pink-500 pointer-events-none z-20"
              style={{ top: `${(ROWS / 2 / ROWS) * 100}%` }}
            >
              <div className="absolute -right-16 -top-3 bg-pink-500 text-white text-xs px-2 py-1 rounded font-bold">
                ${currentPrice.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#12061a] border-t border-pink-900/30 mb-16">
        {/* Balance */}
        <div className="flex items-center gap-2 bg-[#1a1525] rounded-full px-4 py-2 border border-pink-900/30">
          <span className="text-pink-400">💳</span>
          <span className="text-white font-bold">${balance.toFixed(2)}</span>
        </div>

        {/* Bet Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setBetAmount(Math.max(1, betAmount - 5))}
            className="w-10 h-10 rounded-full bg-[#1a1525] border border-pink-900/30 text-white text-xl flex items-center justify-center hover:bg-pink-900/30"
          >
            −
          </button>
          <div className="flex items-center gap-2 bg-[#1a1525] rounded-full px-5 py-2 border border-pink-900/30 min-w-[100px] justify-center">
            <span className="text-white font-bold text-lg">${betAmount}</span>
            <span className="text-yellow-400">🪙</span>
          </div>
          <button
            onClick={() => setBetAmount(Math.min(balance, betAmount + 5))}
            className="w-10 h-10 rounded-full bg-[#1a1525] border border-pink-900/30 text-white text-xl flex items-center justify-center hover:bg-pink-900/30"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default TradingGrid;
