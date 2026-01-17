const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');

// Predefined achievements
const ACHIEVEMENTS = [
    { id: '1', name: 'First Trade', icon: '🎯', description: 'Make your first trade', points: 10, category: 'trading' },
    { id: '2', name: 'Hot Streak', icon: '🔥', description: 'Make 5 winning trades in a row', points: 25, category: 'trading' },
    { id: '3', name: 'Diversified', icon: '📊', description: 'Own 10+ different positions', points: 50, category: 'portfolio' },
    { id: '4', name: 'Diamond Hands', icon: '💎', description: 'Hold a position for 30 days', points: 100, category: 'holding' },
    { id: '5', name: 'Market Mover', icon: '🚀', description: 'Trade $100,000 in volume', points: 200, category: 'trading' },
    { id: '6', name: 'Profit King', icon: '👑', description: 'Achieve 50% portfolio returns', points: 500, category: 'performance' },
    { id: '7', name: 'Social Butterfly', icon: '🦋', description: 'Follow 10 traders', points: 15, category: 'social' },
    { id: '8', name: 'Challenger', icon: '⚔️', description: 'Join your first challenge', points: 20, category: 'challenges' },
    { id: '9', name: 'Champion', icon: '🏆', description: 'Win a challenge', points: 250, category: 'challenges' },
    { id: '10', name: 'Early Bird', icon: '🌅', description: 'Trade before 9:30 AM', points: 10, category: 'trading' }
];

// GET /api/achievements/all
router.get('/all', authenticate, async (req, res) => {
    try {
        // TODO: Check which achievements user has unlocked
        const achievements = ACHIEVEMENTS.map(a => ({
            ...a,
            unlocked: false // Set based on user's actual progress
        }));
        
        res.json({
            achievements,
            summary: {
                points: 0,
                unlocked: 0,
                total: ACHIEVEMENTS.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/achievements/my-achievements
router.get('/my-achievements', authenticate, async (req, res) => {
    try {
        // TODO: Get only unlocked achievements
        res.json({ achievements: [] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/achievements/progress
router.get('/progress', authenticate, async (req, res) => {
    try {
        // TODO: Calculate progress towards each achievement
        res.json({ progress: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/achievements/showcase
router.put('/showcase', authenticate, async (req, res) => {
    try {
        const { badges } = req.body;
        // TODO: Update user's showcased badges
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;