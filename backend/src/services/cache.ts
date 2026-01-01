/**
 * Redis Cache Service
 * Provides caching with Redis or in-memory fallback
 */

import { createClient, RedisClientType } from 'redis';

// =============================================================================
// LOGGING
// =============================================================================

const log = (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [CACHE]`;

  if (level === 'ERROR') {
    console.error(`${prefix} ${message}`, data || '');
  } else if (level === 'WARN') {
    console.warn(`${prefix} ${message}`, data || '');
  } else {
    console.log(`${prefix} ${message}`, data || '');
  }
};

// =============================================================================
// IN-MEMORY FALLBACK CACHE
// =============================================================================

interface CacheEntry {
  value: string;
  expiresAt?: number;
}

class InMemoryCache {
  private store: Map<string, CacheEntry> = new Map();

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: string, ttlSeconds?: number): void {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined,
    });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  size(): number {
    return this.store.size;
  }
}

// =============================================================================
// CACHE SERVICE
// =============================================================================

class CacheService {
  private client: RedisClientType | null = null;
  private inMemory: InMemoryCache = new InMemoryCache();
  private connected: boolean = false;
  private usingFallback: boolean = false;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    errors: 0,
  };

  async connect() {
    log('INFO', 'Connecting to Redis...', { url: process.env.REDIS_URL || 'redis://localhost:6379' });

    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000, // 5 second timeout
          reconnectStrategy: (retries: number) => {
            if (retries > 3) {
              log('WARN', 'Redis connection failed after 3 retries, using in-memory fallback');
              return false; // Stop reconnecting
            }
            return Math.min(retries * 500, 3000); // Exponential backoff
          },
        },
      });

      this.client.on('error', (err) => {
        // Only log first error and then periodically
        if (this.stats.errors === 0 || this.stats.errors % 10 === 0) {
          log('ERROR', 'Redis connection error', { error: err.message, errorCount: this.stats.errors + 1 });
        }
        this.stats.errors++;
      });

      this.client.on('reconnecting', () => {
        log('DEBUG', 'Redis reconnecting...');
      });

      this.client.on('ready', () => {
        log('INFO', 'Redis connection ready');
        this.usingFallback = false;
      });

      this.client.on('end', () => {
        log('WARN', 'Redis connection ended, switching to in-memory fallback');
        this.usingFallback = true;
      });

      await this.client.connect();
      this.connected = true;
      this.usingFallback = false;
      log('INFO', 'Connected to Redis successfully');
    } catch (error: any) {
      log('WARN', 'Failed to connect to Redis, using in-memory fallback', { error: error.message });
      if (this.client) {
        try {
          await this.client.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      }
      this.client = null;
      this.connected = true; // Still "connected" using fallback
      this.usingFallback = true;
    }
  }

  async disconnect() {
    log('INFO', 'Disconnecting from cache...');

    if (this.client) {
      try {
        await this.client.disconnect();
        log('INFO', 'Redis disconnected');
      } catch (error: any) {
        log('ERROR', 'Error disconnecting from Redis', { error: error.message });
      }
    }

    this.connected = false;
    log('INFO', 'Cache stats', this.stats);
  }

  isConnected(): boolean {
    return this.connected;
  }

  isUsingFallback(): boolean {
    return this.usingFallback;
  }

  getStats() {
    return {
      ...this.stats,
      usingFallback: this.usingFallback,
      inMemorySize: this.inMemory.size(),
    };
  }

  async get(key: string): Promise<string | null> {
    log('DEBUG', `GET ${key}`);

    try {
      let value: string | null = null;

      if (this.client && !this.usingFallback) {
        value = await this.client.get(key);
      } else {
        value = this.inMemory.get(key);
      }

      if (value !== null) {
        this.stats.hits++;
        log('DEBUG', `GET ${key} - HIT`);
      } else {
        this.stats.misses++;
        log('DEBUG', `GET ${key} - MISS`);
      }

      return value;
    } catch (error: any) {
      log('ERROR', `GET ${key} - ERROR`, { error: error.message });
      this.stats.errors++;

      // Fallback to in-memory on error
      return this.inMemory.get(key);
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    log('DEBUG', `SET ${key}`, { ttl, valueLength: value.length });

    try {
      if (this.client && !this.usingFallback) {
        if (ttl) {
          await this.client.setEx(key, ttl, value);
        } else {
          await this.client.set(key, value);
        }
      } else {
        this.inMemory.set(key, value, ttl);
      }

      this.stats.sets++;
      log('DEBUG', `SET ${key} - OK`);
    } catch (error: any) {
      log('ERROR', `SET ${key} - ERROR`, { error: error.message });
      this.stats.errors++;

      // Fallback to in-memory on error
      this.inMemory.set(key, value, ttl);
    }
  }

  async del(key: string): Promise<void> {
    log('DEBUG', `DEL ${key}`);

    try {
      if (this.client && !this.usingFallback) {
        await this.client.del(key);
      }

      // Always delete from in-memory as well
      this.inMemory.del(key);

      log('DEBUG', `DEL ${key} - OK`);
    } catch (error: any) {
      log('ERROR', `DEL ${key} - ERROR`, { error: error.message });
      this.stats.errors++;
    }
  }
}

export const cacheService = new CacheService();
