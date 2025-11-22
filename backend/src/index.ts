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

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Geo-blocking for restricted jurisdictions
app.use(geoBlockMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Routes
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/rewards', rewardsRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 TapBlitz Backend running on port ${PORT}`);

  // Initialize services
  try {
    await cacheService.connect();
    console.log('✅ Cache service connected');

    await indexerService.start();
    console.log('✅ Indexer service started');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await indexerService.stop();
  await cacheService.disconnect();
  process.exit(0);
});
