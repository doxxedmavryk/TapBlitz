/**
 * Euphoria-style Grid Trading Interface
 * Tap on cells to place trades at different price levels
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { contractsService } from '@/services/contracts';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

interface PriceCell {
  row: number;
  col: number;
  price: number;
  multiplier: number;
  isCurrentPrice: boolean;
  isAbovePrice: boolean;
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
  const [balance, setBalance] = useState(98.01); // Mock balance
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [currentPrice, setCurrentPrice] = useState(selectedMarket?.markPrice || 3843);
  const [selectedCell, setSelectedCell] = useState<PriceCell | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastWin, setLastWin] = useState<{ amount: number; show: boolean } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Grid configuration
  const ROWS = 12;
  const COLS = 5;
  const PRICE_STEP = selectedMarket?.symbol === 'BTC/USD' ? 50 : 0.5;

  // Generate price cells
  const generateCells = useCallback((): PriceCell[][] => {
    const cells: PriceCell[][] = [];
    const basePrice = currentPrice;
    const halfRows = Math.floor(ROWS / 2);

    for (let row = 0; row < ROWS; row++) {
      const rowCells: PriceCell[] = [];
      const priceOffset = (halfRows - row) * PRICE_STEP;
      const rowPrice = basePrice + priceOffset;

      for (let col = 0; col < COLS; col++) {
        // Calculate multiplier based on distance from current price and time (col)
        const priceDistance = Math.abs(priceOffset) / PRICE_STEP;
        const timeMultiplier = 1 + (col * 0.3);
        const baseMultiplier = 1.5 + priceDistance * 0.5;
        const multiplier = baseMultiplier * timeMultiplier;

        rowCells.push({
          row,
          col,
          price: rowPrice,
          multiplier: Math.round(multiplier * 100) / 100,
          isCurrentPrice: Math.abs(priceOffset) < PRICE_STEP / 2,
          isAbovePrice: priceOffset > 0,
        });
      }
      cells.push(rowCells);
    }
    return cells;
  }, [currentPrice, PRICE_STEP]);

  const [cells, setCells] = useState<PriceCell[][]>(generateCells());

  // Update cells when price changes
  useEffect(() => {
    setCells(generateCells());
  }, [generateCells]);

  // Simulate price movement
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrice((prev) => {
        const change = (Math.random() - 0.5) * PRICE_STEP * 0.5;
        const newPrice = prev + change;
        setPriceHistory((history) => [...history.slice(-50), newPrice]);
        return newPrice;
      });
    }, 2000);

    // Initialize price history
    const initialHistory = [];
    let price = currentPrice;
    for (let i = 0; i < 30; i++) {
      price += (Math.random() - 0.5) * PRICE_STEP * 0.3;
      initialHistory.push(price);
    }
    setPriceHistory(initialHistory);

    return () => clearInterval(interval);
  }, []);

  // Draw price line chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || priceHistory.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate price range
    const minPrice = Math.min(...priceHistory);
    const maxPrice = Math.max(...priceHistory);
    const priceRange = maxPrice - minPrice || 1;

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = '#ec4899'; // Pink
    ctx.lineWidth = 2;

    priceHistory.forEach((price, i) => {
      const x = (i / (priceHistory.length - 1)) * width;
      const y = height - ((price - minPrice) / priceRange) * height * 0.8 - height * 0.1;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(236, 72, 153, 0.3)');
    gradient.addColorStop(1, 'rgba(236, 72, 153, 0)');

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }, [priceHistory]);

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

    // Play click sound
    if (soundEnabled) {
      playSound('click');
    }

    try {
      toast.loading(`Placing ${cell.isAbovePrice ? 'UP' : 'DOWN'} bet at $${cell.price.toFixed(2)}...`, {
        id: 'trade-toast',
      });

      // Simulate trade execution (in production, call contractsService)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate win/loss (70% win rate for demo)
      const won = Math.random() < 0.7;
      const payout = won ? betAmount * cell.multiplier : 0;

      if (won) {
        setBalance((prev) => prev + payout - betAmount);
        setLastWin({ amount: payout - betAmount, show: true });

        toast.success(`You won $${(payout - betAmount).toFixed(2)}!`, {
          id: 'trade-toast',
          duration: 3000,
        });

        if (animationsEnabled) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.3 },
          });
        }

        if (soundEnabled) {
          playSound('win');
        }

        // Hide win notification after 3 seconds
        setTimeout(() => setLastWin(null), 3000);
      } else {
        setBalance((prev) => prev - betAmount);
        toast.error('Better luck next time!', {
          id: 'trade-toast',
          duration: 2000,
        });

        if (soundEnabled) {
          playSound('lose');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Trade failed', { id: 'trade-toast' });
    } finally {
      setIsProcessing(false);
      setSelectedCell(null);
    }
  };

  const playSound = (type: 'click' | 'win' | 'lose') => {
    // Sound implementation
    const frequencies: Record<string, number> = {
      click: 800,
      win: 1200,
      lose: 400,
    };

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
    } catch (e) {
      // Audio not available
    }
  };

  const adjustBetAmount = (delta: number) => {
    setBetAmount((prev) => Math.max(1, Math.min(balance, prev + delta)));
  };

  return (
    <div className="fixed inset-0 bg-[#1a0a1a] flex flex-col">
      {/* Win Notification */}
      {lastWin?.show && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-[#1a1a2e] border border-green-500/30 rounded-full px-6 py-3 flex items-center gap-2">
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
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-2xl font-bold text-pink-500">euph</div>

        {/* Current Price */}
        <div className="flex items-center gap-2 bg-[#2a1a2a] rounded-full px-4 py-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
            <span className="text-xs">◆</span>
          </div>
          <span className="text-green-400 font-bold text-lg">{currentPrice.toFixed(2)}</span>
        </div>

        {/* Settings */}
        <button
          onClick={onSettingsClick}
          className="w-10 h-10 rounded-full bg-[#2a1a2a] flex items-center justify-center"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Main Trading Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Price Chart (Left side) */}
        <div className="w-1/4 relative">
          <canvas
            ref={canvasRef}
            width={150}
            height={500}
            className="absolute inset-0 w-full h-full"
          />

          {/* Last Profit Indicator */}
          {lastWin && (
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <span className="text-green-400 font-bold text-lg">+${lastWin.amount.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Trading Grid (Right side) */}
        <div ref={gridRef} className="flex-1 relative">
          {/* Grid Lines */}
          <div
            className="absolute inset-0 grid"
            style={{
              gridTemplateRows: `repeat(${ROWS}, 1fr)`,
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            }}
          >
            {cells.flat().map((cell) => (
              <button
                key={`${cell.row}-${cell.col}`}
                onClick={() => handleCellClick(cell)}
                disabled={isProcessing}
                className={`
                  relative border border-pink-900/30 transition-all duration-150
                  ${cell.isCurrentPrice ? 'bg-pink-500/20' : 'hover:bg-pink-500/10'}
                  ${selectedCell?.row === cell.row && selectedCell?.col === cell.col ? 'bg-yellow-400 scale-105' : ''}
                  ${isProcessing ? 'cursor-wait' : 'cursor-pointer'}
                `}
              >
                <span className={`
                  text-xs font-medium
                  ${cell.isCurrentPrice ? 'text-pink-400' : 'text-pink-600/70'}
                  ${selectedCell?.row === cell.row && selectedCell?.col === cell.col ? 'text-black font-bold' : ''}
                `}>
                  {cell.multiplier.toFixed(2)}x
                </span>
              </button>
            ))}
          </div>

          {/* Price Labels (Right edge) */}
          <div className="absolute right-0 top-0 bottom-0 w-16 flex flex-col justify-between py-2 text-right pr-2">
            {cells.map((row, i) => (
              <div key={i} className="text-xs text-gray-500">
                ${row[0].price.toFixed(1)}
              </div>
            ))}
          </div>

          {/* Current Price Line */}
          <div
            className="absolute left-0 right-16 h-0.5 bg-pink-500 z-10 pointer-events-none"
            style={{ top: '50%' }}
          >
            <div className="absolute right-0 -top-3 bg-pink-500 text-white text-xs px-2 py-1 rounded">
              ${currentPrice.toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex items-center justify-between px-4 py-4 bg-[#1a0a1a]">
        {/* Balance */}
        <div className="flex items-center gap-2 bg-[#2a1a2a] rounded-full px-4 py-3">
          <div className="w-6 h-6 rounded bg-pink-500 flex items-center justify-center">
            <span className="text-white text-xs">💳</span>
          </div>
          <span className="text-white font-bold">${balance.toFixed(2)}</span>
        </div>

        {/* Bet Amount */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustBetAmount(-5)}
            className="w-8 h-8 rounded-full bg-[#2a1a2a] text-white flex items-center justify-center"
          >
            -
          </button>
          <div className="flex items-center gap-2 bg-[#2a1a2a] rounded-full px-4 py-3">
            <span className="text-white font-bold">${betAmount}</span>
            <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
              <span className="text-xs">🪙</span>
            </div>
          </div>
          <button
            onClick={() => adjustBetAmount(5)}
            className="w-8 h-8 rounded-full bg-[#2a1a2a] text-white flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default TradingGrid;
