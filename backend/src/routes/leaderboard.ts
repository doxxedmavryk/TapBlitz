/**
 * Leaderboard API Routes
 */

import express from 'express';
import { cacheService } from '../services/cache.js';

const router = express.Router();

// Get leaderboard
router.get('/', async (req, res) => {
  try {
    const cached = await cacheService.get('leaderboard');

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // If not cached, return empty array
    res.json([]);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get user rank
router.get('/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const cached = await cacheService.get('leaderboard');

    if (!cached) {
      return res.json({ rank: null, stats: null });
    }

    const leaderboard = JSON.parse(cached);
    const userEntry = leaderboard.find((entry: any) => entry.address === address);

    res.json(userEntry || { rank: null, stats: null });
  } catch (error) {
    console.error('User rank error:', error);
    res.status(500).json({ error: 'Failed to fetch user rank' });
  }
});

export default router;
