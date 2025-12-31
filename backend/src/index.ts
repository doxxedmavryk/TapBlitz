/**
 * TapBlitz Backend API Server
 * Provides indexing, leaderboards, and off-chain features
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Routes
import leaderboardRoutes from './routes/leaderboard.js';
import achievementsRoutes from './routes/achievements.js';
import statsRoutes from './routes/stats.js';
import rewardsRoutes from './routes/rewards.js';

// Services
import { indexerService } from './services/indexer.js';
import { cacheService } from './services/cache.js';
import { geoBlockMiddleware } from './middleware/geoblock.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// =============================================================================
// LOGGING UTILITIES
// =============================================================================

const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
} as const;

const log = (level: keyof typeof LOG_LEVELS, context: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    context,
    message,
    ...(data && { data }),
  };

  if (level === 'ERROR') {
    console.error(`[${timestamp}] [${level}] [${context}] ${message}`, data || '');
  } else if (level === 'WARN') {
    console.warn(`[${timestamp}] [${level}] [${context}] ${message}`, data || '');
  } else {
    console.log(`[${timestamp}] [${level}] [${context}] ${message}`, data || '');
  }
};

// =============================================================================
// REQUEST LOGGING MIDDLEWARE
// =============================================================================

app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);

  log('INFO', 'REQUEST', `[${requestId}] ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined,
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'WARN' : 'INFO';
    log(level, 'RESPONSE', `[${requestId}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// =============================================================================
// MIDDLEWARE
// =============================================================================

log('INFO', 'STARTUP', 'Configuring middleware...');

app.use(helmet());
log('DEBUG', 'STARTUP', 'Helmet security middleware enabled');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
log('DEBUG', 'STARTUP', `CORS enabled for origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);

app.use(express.json());
log('DEBUG', 'STARTUP', 'JSON body parser enabled');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  handler: (req, res) => {
    log('WARN', 'RATE_LIMIT', `Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ error: 'Too many requests from this IP, please try again later.' });
  },
});
app.use('/api/', limiter);
log('DEBUG', 'STARTUP', 'Rate limiting enabled (100 req/15min)');

// Geo-blocking for restricted jurisdictions
app.use(geoBlockMiddleware);
log('DEBUG', 'STARTUP', 'Geo-blocking middleware enabled');

// =============================================================================
// ROOT ROUTE - API INFORMATION
// =============================================================================

app.get('/', (req, res) => {
  log('INFO', 'ROOT', 'Root endpoint accessed');
  res.json({
    name: 'TapBlitz API',
    version: '1.0.0',
    description: 'Gamified derivatives trading platform API',
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    endpoints: {
      root: '/',
      health: '/health',
      leaderboard: '/api/leaderboard',
      achievements: '/api/achievements/user/:address',
      stats: {
        global: '/api/stats/global',
        user: '/api/stats/user/:address',
      },
      rewards: {
        daily: '/api/rewards/daily/:address',
        claim: '/api/rewards/daily/:address/claim/:day',
      },
    },
    documentation: 'https://github.com/tapblitz/api-docs',
  });
});

// Health check
app.get('/health', (req, res) => {
  log('DEBUG', 'HEALTH', 'Health check requested');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      cache: cacheService.isConnected() ? 'connected' : 'disconnected',
      indexer: indexerService.isRunning() ? 'running' : 'stopped',
    },
  });
});

// =============================================================================
// API ROUTES
// =============================================================================

log('INFO', 'STARTUP', 'Registering API routes...');

app.use('/api/leaderboard', leaderboardRoutes);
log('DEBUG', 'STARTUP', 'Registered /api/leaderboard routes');

app.use('/api/achievements', achievementsRoutes);
log('DEBUG', 'STARTUP', 'Registered /api/achievements routes');

app.use('/api/stats', statsRoutes);
log('DEBUG', 'STARTUP', 'Registered /api/stats routes');

app.use('/api/rewards', rewardsRoutes);
log('DEBUG', 'STARTUP', 'Registered /api/rewards routes');

// =============================================================================
// 404 HANDLER
// =============================================================================

app.use((req, res) => {
  log('WARN', '404', `Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} does not exist`,
    availableEndpoints: ['/', '/health', '/api/leaderboard', '/api/achievements', '/api/stats', '/api/rewards'],
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  log('ERROR', 'ERROR_HANDLER', `Unhandled error: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

app.listen(PORT, async () => {
  console.log('\n' + '='.repeat(60));
  console.log('  TapBlitz Backend API Server');
  console.log('='.repeat(60));
  log('INFO', 'STARTUP', `🚀 Server running on port ${PORT}`);
  log('INFO', 'STARTUP', `Environment: ${process.env.NODE_ENV || 'development'}`);
  log('INFO', 'STARTUP', `Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);

  // Initialize services
  try {
    log('INFO', 'STARTUP', 'Initializing cache service...');
    await cacheService.connect();
    log('INFO', 'STARTUP', '✅ Cache service connected');

    log('INFO', 'STARTUP', 'Initializing indexer service...');
    await indexerService.start();
    log('INFO', 'STARTUP', '✅ Indexer service started');

    console.log('='.repeat(60));
    console.log('  All services initialized successfully!');
    console.log('  API available at: http://localhost:' + PORT);
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    log('ERROR', 'STARTUP', '❌ Failed to initialize services', error);
  }
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

process.on('SIGTERM', async () => {
  log('INFO', 'SHUTDOWN', 'SIGTERM received, shutting down gracefully...');

  try {
    await indexerService.stop();
    log('INFO', 'SHUTDOWN', 'Indexer service stopped');

    await cacheService.disconnect();
    log('INFO', 'SHUTDOWN', 'Cache service disconnected');

    log('INFO', 'SHUTDOWN', 'Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    log('ERROR', 'SHUTDOWN', 'Error during shutdown', error);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', 'UNHANDLED_REJECTION', 'Unhandled Promise Rejection', { reason });
});

process.on('uncaughtException', (error) => {
  log('ERROR', 'UNCAUGHT_EXCEPTION', 'Uncaught Exception', { error: error.message, stack: error.stack });
});
