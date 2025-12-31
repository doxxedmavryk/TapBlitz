/**
 * Blockchain Indexer Service
 * Monitors Mavryk blockchain for contract events and updates database
 */

import { TezosToolkit } from '@taquito/taquito';
import cron from 'node-cron';
import { cacheService } from './cache.js';

// =============================================================================
// LOGGING
// =============================================================================

const log = (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [INDEXER]`;

  if (level === 'ERROR') {
    console.error(`${prefix} ${message}`, data || '');
  } else if (level === 'WARN') {
    console.warn(`${prefix} ${message}`, data || '');
  } else {
    console.log(`${prefix} ${message}`, data || '');
  }
};

// =============================================================================
// RETRY HELPER
// =============================================================================

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context: string = 'operation'
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        log('DEBUG', `Retry ${attempt}/${maxRetries} for ${context}`);
      }
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        log('DEBUG', `${context} failed, retrying in ${delay}ms`, { error: (error as Error).message });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  log('ERROR', `${context} failed after ${maxRetries} retries`, { error: lastError?.message });
  throw lastError;
}

// =============================================================================
// INDEXER SERVICE
// =============================================================================

class IndexerService {
  private tezos: TezosToolkit;
  private running: boolean = false;
  private cronJob: cron.ScheduledTask | null = null;
  private consecutiveErrors: number = 0;
  private maxConsecutiveErrors: number = 10;
  private contractAddresses: {
    perpetuals: string;
    options: string;
    euphToken: string;
  };
  private stats = {
    blocksIndexed: 0,
    transactionsProcessed: 0,
    errors: 0,
    lastBlockLevel: 0,
    lastIndexTime: null as Date | null,
  };

  constructor() {
    const rpcUrl = process.env.MAVRYK_RPC_URL || 'https://atlasnet.rpc.mavryk.network';
    log('INFO', 'Initializing indexer', { rpcUrl });

    this.tezos = new TezosToolkit(rpcUrl);

    this.contractAddresses = {
      perpetuals: process.env.PERPETUALS_CONTRACT || '',
      options: process.env.OPTIONS_CONTRACT || '',
      euphToken: process.env.EUPH_TOKEN_CONTRACT || '',
    };

    log('DEBUG', 'Contract addresses configured', {
      perpetuals: this.contractAddresses.perpetuals || '(not set)',
      options: this.contractAddresses.options || '(not set)',
      euphToken: this.contractAddresses.euphToken || '(not set)',
    });
  }

  isRunning(): boolean {
    return this.running;
  }

  getStats() {
    return {
      ...this.stats,
      consecutiveErrors: this.consecutiveErrors,
      isRunning: this.running,
    };
  }

  async start() {
    if (this.running) {
      log('WARN', 'Indexer already running');
      return;
    }

    log('INFO', 'Starting indexer service...');
    this.running = true;

    // Index historical data (don't block on failure)
    this.indexHistoricalData().catch(err => {
      log('WARN', 'Historical indexing skipped due to error', { error: err.message });
    });

    // Start periodic indexing (every 2 minutes to reduce load)
    this.cronJob = cron.schedule('*/2 * * * *', async () => {
      log('DEBUG', 'Cron trigger: indexing latest blocks');
      await this.indexLatestBlocks();
    });

    log('INFO', 'Indexer service started (cron: every 2 minutes)');
  }

  async stop() {
    log('INFO', 'Stopping indexer service...');

    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }

    this.running = false;
    log('INFO', 'Indexer service stopped', this.stats);
  }

  private async indexHistoricalData() {
    log('INFO', 'Starting historical data indexing...');

    try {
      // Index positions
      log('DEBUG', 'Indexing positions...');
      await this.indexPositions();

      // Index options
      log('DEBUG', 'Indexing options...');
      await this.indexOptions();

      // Calculate leaderboard
      log('DEBUG', 'Updating leaderboard...');
      await this.updateLeaderboard();

      log('INFO', 'Historical indexing complete');
    } catch (error: any) {
      log('ERROR', 'Error indexing historical data', { error: error.message, stack: error.stack });
      this.stats.errors++;
    }
  }

  private async indexLatestBlocks() {
    if (!this.running) {
      log('DEBUG', 'Indexer not running, skipping');
      return;
    }

    // Skip if too many consecutive errors (RPC might be down)
    if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
      log('WARN', `Skipping indexing due to ${this.consecutiveErrors} consecutive errors. Will retry next cycle.`);
      this.consecutiveErrors = Math.max(0, this.consecutiveErrors - 1); // Slowly recover
      return;
    }

    const startTime = Date.now();

    try {
      // Get latest block with retry
      log('DEBUG', 'Fetching latest block...');
      const block = await withRetry(() => this.tezos.rpc.getBlock(), 3, 2000, 'getBlock');
      const blockLevel = block.header.level;

      log('DEBUG', `Latest block: ${blockLevel}`);

      // Get last indexed block from cache
      const lastIndexedBlock = await cacheService.get('last_indexed_block');
      const startBlock = lastIndexedBlock ? parseInt(lastIndexedBlock) + 1 : blockLevel - 5;

      // Limit number of blocks to index per cycle to avoid timeouts
      const maxBlocksPerCycle = 10;
      const endBlock = Math.min(startBlock + maxBlocksPerCycle, blockLevel);

      if (startBlock > endBlock) {
        log('DEBUG', 'No new blocks to index');
        return;
      }

      log('INFO', `Indexing blocks ${startBlock} to ${endBlock} (${endBlock - startBlock + 1} blocks)`);

      // Index blocks
      let indexedCount = 0;
      for (let level = startBlock; level <= endBlock; level++) {
        const success = await this.indexBlock(level);
        if (success) {
          indexedCount++;
          this.stats.blocksIndexed++;
        }
      }

      // Update last indexed block
      await cacheService.set('last_indexed_block', endBlock.toString());
      this.stats.lastBlockLevel = endBlock;
      this.stats.lastIndexTime = new Date();

      // Reset error counter on success
      this.consecutiveErrors = 0;

      const duration = Date.now() - startTime;
      log('INFO', `Indexed ${indexedCount} blocks in ${duration}ms`);
    } catch (error: any) {
      this.consecutiveErrors++;
      this.stats.errors++;

      // Only log every 5th error to reduce noise
      if (this.consecutiveErrors % 5 === 1) {
        log('ERROR', `Error indexing blocks (${this.consecutiveErrors} consecutive)`, { error: error.message });
      }
    }
  }

  private async indexBlock(level: number): Promise<boolean> {
    try {
      log('DEBUG', `Indexing block ${level}...`);

      const block = await withRetry(
        () => this.tezos.rpc.getBlock({ block: level.toString() }),
        2,
        1000,
        `getBlock(${level})`
      );

      let txCount = 0;

      for (const operation of block.operations.flat()) {
        if (!operation.contents) continue;

        for (const content of operation.contents) {
          if (content.kind !== 'transaction') continue;

          const tx: any = content;
          if (!tx.destination) continue;

          // Check if transaction is to one of our contracts
          if (tx.destination === this.contractAddresses.perpetuals) {
            await this.handlePerpetualsTransaction(tx, operation.hash);
            txCount++;
          } else if (tx.destination === this.contractAddresses.options) {
            await this.handleOptionsTransaction(tx, operation.hash);
            txCount++;
          }
        }
      }

      if (txCount > 0) {
        log('INFO', `Block ${level}: processed ${txCount} transactions`);
        this.stats.transactionsProcessed += txCount;
      }

      return true;
    } catch (error: any) {
      log('DEBUG', `Error indexing block ${level}`, { error: error.message });
      return false;
    }
  }

  private async handlePerpetualsTransaction(tx: any, opHash: string) {
    log('INFO', `Perpetuals transaction: ${opHash}`, {
      source: tx.source,
      amount: tx.amount,
      entrypoint: tx.parameters?.entrypoint,
    });

    // Parse transaction and update database
    // In production, parse parameters and store position data
  }

  private async handleOptionsTransaction(tx: any, opHash: string) {
    log('INFO', `Options transaction: ${opHash}`, {
      source: tx.source,
      amount: tx.amount,
      entrypoint: tx.parameters?.entrypoint,
    });

    // Parse transaction and update database
  }

  private async indexPositions() {
    log('DEBUG', 'Indexing positions from contract storage...');

    // Fetch all positions from contract storage
    // Store in database/cache
    // For now, this is a stub

    log('DEBUG', 'Positions indexing complete');
  }

  private async indexOptions() {
    log('DEBUG', 'Indexing options from contract storage...');

    // Fetch all options from contract storage
    // Store in database/cache
    // For now, this is a stub

    log('DEBUG', 'Options indexing complete');
  }

  private async updateLeaderboard() {
    log('DEBUG', 'Calculating leaderboard...');

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
    log('INFO', `Leaderboard updated (${mockLeaderboard.length} entries)`);
  }
}

export const indexerService = new IndexerService();
