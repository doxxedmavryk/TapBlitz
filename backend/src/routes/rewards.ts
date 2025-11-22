/**
 * Rewards API Routes
 */

import express from 'express';
import { cacheService } from '../services/cache.js';

const router = express.Router();

// Get daily rewards for user
router.get('/daily/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const cacheKey = `daily_rewards:${address}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Generate default rewards
    const rewards = [];
    for (let day = 1; day <= 7; day++) {
      rewards.push({
        day,
        amount: day * 10,
        claimed: false,
        claimableAt: new Date(Date.now() + day * 24 * 60 * 60 * 1000),
      });
    }

    res.json(rewards);
  } catch (error) {
    console.error('Rewards error:', error);
    res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});

// Claim daily reward
router.post('/daily/:address/claim/:day', async (req, res) => {
  try {
    const { address, day } = req.params;

    // In production, verify claim eligibility and update database

    res.json({ success: true, amount: parseInt(day) * 10 });
  } catch (error) {
    console.error('Claim error:', error);
    res.status(500).json({ error: 'Failed to claim reward' });
  }
});

export default router;
