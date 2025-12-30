/**
 * Blockchain Indexer Service
 * Monitors Mavryk blockchain for contract events and updates database
 */

import { TezosToolkit } from '@taquito/taquito';
import cron from 'node-cron';
import { cacheService } from './cache.js';

// Fallback RPC URLs for Mavryk Ghostnet
const RPC_URLS = [
  'https://rpc.ghostnet.mavryk.network',
  'https://ghostnet.mavryk.network',
  'https://rpc.ghostnet.mavrykdynamics.com',
];

class IndexerService {
  private tezos: TezosToolkit;
  private isRunning: boolean = false;
  private currentRpcIndex: number = 0;
  private consecutiveFailures: number = 0;
  private contractAddresses: {
    perpetuals: string;
    options: string;
    euphToken: string;
  };

  constructor() {
    const rpcUrl = process.env.MAVRYK_RPC_URL || RPC_URLS[0];
    this.tezos = new TezosToolkit(rpcUrl);

    this.contractAddresses = {
      perpetuals: process.env.PERPETUALS_CONTRACT || '',
      options: process.env.OPTIONS_CONTRACT || '',
      euphToken: process.env.EUPH_TOKEN_CONTRACT || '',
    };
  }

  /**
   * Retry an operation with exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3,
    initialDelayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        // Reset failure counter on success
        this.consecutiveFailures = 0;
        return result;
      } catch (error: any) {
        lastError = error;
        this.consecutiveFailures++;

        const isLastAttempt = attempt === maxRetries;
        const delay = initialDelayMs * Math.pow(2, attempt);

        if (!isLastAttempt) {
          console.warn(
            `${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`,
            error.message || error
          );
          await this.sleep(delay);

          // Try switching RPC on persistent failures
          if (this.consecutiveFailures >= 2) {
            this.switchRpc();
          }
        }
      }
    }

    throw lastError;
  }

  /**
   * Switch to the next available RPC endpoint
   */
  private switchRpc(): void {
    const previousIndex = this.currentRpcIndex;
    this.currentRpcIndex = (this.currentRpcIndex + 1) % RPC_URLS.length;
    const newRpcUrl = RPC_URLS[this.currentRpcIndex];

    console.log(`Switching RPC from ${RPC_URLS[previousIndex]} to ${newRpcUrl}`);
    this.tezos = new TezosToolkit(newRpcUrl);
    this.consecutiveFailures = 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async start() {
    if (this.isRunning) {
      console.log('Indexer already running');
      return;
    }

    this.isRunning = true;

    // Index historical data
    await this.indexHistoricalData();

    // Start periodic indexing (every minute)
    cron.schedule('* * * * *', async () => {
      await this.indexLatestBlocks();
    });

    console.log('Indexer service started');
  }

  async stop() {
    this.isRunning = false;
    console.log('Indexer service stopped');
  }

  private async indexHistoricalData() {
    console.log('Indexing historical data...');

    try {
      // Index positions
      await this.indexPositions();

      // Index options
      await this.indexOptions();

      // Calculate leaderboard
      await this.updateLeaderboard();

      console.log('Historical indexing complete');
    } catch (error) {
      console.error('Error indexing historical data:', error);
    }
  }

  private async indexLatestBlocks() {
    if (!this.isRunning) return;

    try {
      // Get latest block with retry logic
      const block = await this.withRetry(
        () => this.tezos.rpc.getBlock(),
        'Get latest block'
      );
      const blockLevel = block.header.level;

      // Get last indexed block from cache
      const lastIndexedBlock = await cacheService.get('last_indexed_block');
      const startBlock = lastIndexedBlock ? parseInt(lastIndexedBlock) + 1 : blockLevel - 10;

      // Index blocks
      for (let level = startBlock; level <= blockLevel; level++) {
        await this.indexBlock(level);
      }

      // Update last indexed block
      await cacheService.set('last_indexed_block', blockLevel.toString());
    } catch (error) {
      console.error('Error indexing latest blocks after retries:', error);
      // Don't throw - allow the cron job to try again on next tick
    }
  }

  private async indexBlock(level: number) {
    try {
      const block = await this.withRetry(
        () => this.tezos.rpc.getBlock({ block: level.toString() }),
        `Get block ${level}`,
        2, // Fewer retries for individual blocks
        500
      );

      for (const operation of block.operations.flat()) {
        if (!operation.contents) continue;

        for (const content of operation.contents) {
          if (content.kind !== 'transaction') continue;

          const tx: any = content;
          if (!tx.destination) continue;

          // Check if transaction is to one of our contracts
          if (tx.destination === this.contractAddresses.perpetuals) {
            await this.handlePerpetualsTransaction(tx, operation.hash);
          } else if (tx.destination === this.contractAddresses.options) {
            await this.handleOptionsTransaction(tx, operation.hash);
          }
        }
      }
    } catch (error) {
      console.error(`Error indexing block ${level} after retries:`, error);
      // Continue with next block
    }
  }

  private async handlePerpetualsTransaction(tx: any, opHash: string) {
    // Parse transaction and update database
    // In production, parse parameters and store position data

    console.log(`Perpetuals transaction: ${opHash}`);
  }

  private async handleOptionsTransaction(tx: any, opHash: string) {
    // Parse transaction and update database
    console.log(`Options transaction: ${opHash}`);
  }

  private async indexPositions() {
    // Fetch all positions from contract storage
    // Store in database/cache
  }

  private async indexOptions() {
    // Fetch all options from contract storage
    // Store in database/cache
  }

  private async updateLeaderboard() {
    // Calculate user statistics
    // Rank by total P&L
    // Cache results

    const mockLeaderboard = [
      {
        rank: 1,
        address: 'tz1abc123',
        totalPnl: 1000,
        totalTrades: 50,
        winRate: 65,
        volume: 500000,
      },
      {
        rank: 2,
        address: 'tz1def456',
        totalPnl: 750,
        totalTrades: 40,
        winRate: 60,
        volume: 400000,
      },
    ];

    await cacheService.set('leaderboard', JSON.stringify(mockLeaderboard), 300); // 5 min TTL
  }
}

export const indexerService = new IndexerService();
