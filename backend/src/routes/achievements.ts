/**
 * Achievements API Routes
 */

import express from 'express';
import { cacheService } from '../services/cache.js';

const router = express.Router();

// Get user achievements
router.get('/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const cacheKey = `achievements:${address}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Default achievements for new users
    const defaultAchievements = [
      { id: 'first_trade', progress: 0, unlockedAt: null },
      { id: 'ten_trades', progress: 0, unlockedAt: null },
      { id: 'win_streak_5', progress: 0, unlockedAt: null },
    ];

    res.json(defaultAchievements);
  } catch (error) {
    console.error('Achievements error:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

export default router;
