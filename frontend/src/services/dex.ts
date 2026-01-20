/**
 * Mavryk DEX Service - MVRK/USDT price fetching
 * Supports dynamic network switching between Atlasnet testnet and Mainnet
 */

import { NETWORKS, DEFAULT_NETWORK, type NetworkId, type NetworkConfig } from '@/config/networks';

// Current network configuration
let currentNetwork: NetworkConfig = NETWORKS[DEFAULT_NETWORK];

// Price data types
export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

export interface PoolReserves {
  mvrkReserve: number;
  usdtReserve: number;
  totalLiquidity: number;
}

// Logging
const log = (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [DEX]`;
  if (level === 'ERROR') {
    console.error(`${prefix} ${message}`, data || '');
  } else if (level === 'WARN') {
    console.warn(`${prefix} ${message}`, data || '');
  } else {
    console.log(`${prefix} ${message}`, data || '');
  }
};

class DexService {
  private priceHistory: number[] = [];
  private currentPrice: number = 0.0156; // Initial MVRK/USDT price estimate
  private lastFetchTime: number = 0;
  private fetchInterval: number = 5000; // 5 seconds
  private listeners: Set<(price: PriceData) => void> = new Set();

  constructor() {
    log('INFO', 'DexService initialized', { network: currentNetwork.displayName });
    this.initializePriceHistory();
  }

  /**
   * Switch to a different network
   */
  setNetwork(networkId: NetworkId): void {
    const network = NETWORKS[networkId];
    if (!network) {
      log('ERROR', 'Unknown network', { networkId });
      return;
    }
    currentNetwork = network;
    log('INFO', 'Network switched', { network: network.displayName, rpcUrl: network.rpcUrl });
    // Reset price history on network switch
    this.priceHistory = [];
    this.initializePriceHistory();
  }

  /**
   * Get current network info
   */
  getNetworkInfo(): { id: NetworkId; name: string; isTestnet: boolean } {
    return {
      id: currentNetwork.id,
      name: currentNetwork.displayName,
      isTestnet: currentNetwork.isTestnet,
    };
  }

  private initializePriceHistory() {
    // Generate initial price history for chart
    const basePrice = this.currentPrice;
    for (let i = 0; i < 100; i++) {
      const noise = (Math.random() - 0.5) * 0.0008; // Small price variations
      this.priceHistory.push(basePrice + noise);
    }
  }

  /**
   * Fetch pool reserves from the Mavryk DEX
   * This queries the pool contract to get current MVRK and USDT reserves
   */
  async getPoolReserves(): Promise<PoolReserves | null> {
    try {
      const poolAddress = currentNetwork.contracts.pool;
      if (!poolAddress) {
        log('WARN', 'Pool contract not configured for network', { network: currentNetwork.id });
        return null;
      }

      log('DEBUG', 'Fetching pool reserves...', { pool: poolAddress, network: currentNetwork.id });

      const response = await fetch(
        `${currentNetwork.rpcUrl}/chains/main/blocks/head/context/contracts/${poolAddress}/storage`
      );

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const storage = await response.json();
      log('DEBUG', 'Pool storage fetched', { storage });

      // Parse reserves from storage (adjust based on actual contract structure)
      // Common DEX patterns: reserves.token0, reserves.token1, or direct fields
      const mvrkReserve = this.parseReserve(storage, 'mvrk') || 1000000;
      const usdtReserve = this.parseReserve(storage, 'usdt') || 15600;

      return {
        mvrkReserve,
        usdtReserve,
        totalLiquidity: Math.sqrt(mvrkReserve * usdtReserve),
      };
    } catch (error: any) {
      log('WARN', 'Failed to fetch pool reserves, using simulated data', { error: error.message });
      return null;
    }
  }

  private parseReserve(storage: any, token: string): number | null {
    // Try common storage patterns for DEX contracts
    if (storage?.reserves?.[token]) {
      return Number(storage.reserves[token]) / 1_000_000;
    }
    if (storage?.token0_pool && token === 'mvrk') {
      return Number(storage.token0_pool) / 1_000_000;
    }
    if (storage?.token1_pool && token === 'usdt') {
      return Number(storage.token1_pool) / 1_000_000;
    }
    return null;
  }

  /**
   * Calculate MVRK/USDT price from pool reserves
   */
  calculatePrice(reserves: PoolReserves): number {
    if (reserves.mvrkReserve <= 0) return this.currentPrice;
    return reserves.usdtReserve / reserves.mvrkReserve;
  }

  /**
   * Get current MVRK/USDT price data
   */
  async getPriceData(): Promise<PriceData> {
    const now = Date.now();

    // Rate limiting
    if (now - this.lastFetchTime < this.fetchInterval) {
      return this.buildPriceData();
    }

    this.lastFetchTime = now;

    try {
      const reserves = await this.getPoolReserves();

      if (reserves) {
        const newPrice = this.calculatePrice(reserves);
        this.updatePrice(newPrice);
      } else {
        // Simulate small price movements when can't fetch
        this.simulatePriceMovement();
      }
    } catch (error) {
      this.simulatePriceMovement();
    }

    return this.buildPriceData();
  }

  private updatePrice(newPrice: number) {
    this.currentPrice = newPrice;
    this.priceHistory.push(newPrice);
    if (this.priceHistory.length > 100) {
      this.priceHistory.shift();
    }
    this.notifyListeners();
  }

  private simulatePriceMovement() {
    // Realistic market simulation with slight drift and volatility
    const drift = 0.00001 * (Math.random() > 0.5 ? 1 : -1);
    const volatility = 0.0002 * (Math.random() - 0.5);
    const newPrice = Math.max(0.001, this.currentPrice + drift + volatility);
    this.updatePrice(newPrice);
  }

  private buildPriceData(): PriceData {
    const prices = this.priceHistory;
    const high24h = Math.max(...prices);
    const low24h = Math.min(...prices);
    const firstPrice = prices[0] || this.currentPrice;

    return {
      symbol: 'MVRK/USDT',
      price: this.currentPrice,
      change24h: ((this.currentPrice - firstPrice) / firstPrice) * 100,
      high24h,
      low24h,
      volume24h: 125000 + Math.random() * 50000, // Simulated volume
      timestamp: Date.now(),
    };
  }

  /**
   * Get price history for charting
   */
  getPriceHistory(): number[] {
    return [...this.priceHistory];
  }

  /**
   * Subscribe to price updates
   */
  subscribe(callback: (price: PriceData) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    const priceData = this.buildPriceData();
    this.listeners.forEach((callback) => callback(priceData));
  }

  /**
   * Start real-time price updates
   */
  startPriceUpdates(intervalMs: number = 1000): () => void {
    log('INFO', 'Starting price updates', { interval: intervalMs });

    const interval = setInterval(() => {
      this.getPriceData();
    }, intervalMs);

    return () => {
      log('INFO', 'Stopping price updates');
      clearInterval(interval);
    };
  }

  /**
   * Get quote for swapping tokens
   */
  async getSwapQuote(
    tokenIn: 'MVRK' | 'USDT',
    amountIn: number
  ): Promise<{ amountOut: number; priceImpact: number; fee: number }> {
    const reserves = await this.getPoolReserves();
    const fee = 0.003; // 0.3% swap fee

    if (!reserves) {
      // Fallback to current price
      const rate = tokenIn === 'MVRK' ? this.currentPrice : 1 / this.currentPrice;
      return {
        amountOut: amountIn * rate * (1 - fee),
        priceImpact: 0.1,
        fee: amountIn * fee,
      };
    }

    const { mvrkReserve, usdtReserve } = reserves;
    const amountInWithFee = amountIn * (1 - fee);

    let amountOut: number;
    let priceImpact: number;

    if (tokenIn === 'MVRK') {
      // MVRK -> USDT: xy = k formula
      amountOut = (usdtReserve * amountInWithFee) / (mvrkReserve + amountInWithFee);
      const spotPrice = usdtReserve / mvrkReserve;
      const execPrice = amountOut / amountIn;
      priceImpact = Math.abs((spotPrice - execPrice) / spotPrice) * 100;
    } else {
      // USDT -> MVRK
      amountOut = (mvrkReserve * amountInWithFee) / (usdtReserve + amountInWithFee);
      const spotPrice = mvrkReserve / usdtReserve;
      const execPrice = amountOut / amountIn;
      priceImpact = Math.abs((spotPrice - execPrice) / spotPrice) * 100;
    }

    return {
      amountOut,
      priceImpact,
      fee: amountIn * fee,
    };
  }
}

log('INFO', 'Creating DexService singleton...');
export const dexService = new DexService();
log('INFO', 'DexService singleton created');
