/**
 * Statistics API Routes
 */

import express from 'express';
import { cacheService } from '../services/cache.js';

const router = express.Router();

// Get global statistics
router.get('/global', async (req, res) => {
  try {
    const stats = {
      totalVolume: 50000000,
      totalTrades: 12543,
      activeUsers: 1234,
      totalValueLocked: 5000000,
    };

    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get user statistics
router.get('/user/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Mock user stats
    const stats = {
      totalPnl: 0,
      totalTrades: 0,
      winRate: 0,
      currentStreak: 0,
      maxStreak: 0,
    };

    res.json(stats);
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

export default router;
