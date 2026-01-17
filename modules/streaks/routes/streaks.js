const express = require('express');
const router = express.Router();

// Get user streak info
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user logged in today
    const today = new Date().toISOString().split('T')[0];
    
    // Mock response - replace with DB query
    const streakData = {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      todayCompleted: false,
      nextMilestone: 7,
      milestoneReward: 0.50
    };
    
    res.json(streakData);
  } catch (error) {
    console.error('Streak fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch streak' });
  }
});

// Record daily login / activity
router.post('/:userId/checkin', async (req, res) => {
  try {
    const { userId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    
    // TODO: Database logic
    // 1. Get user's last active date
    // 2. If lastActiveDate === yesterday, increment streak
    // 3. If lastActiveDate === today, do nothing
    // 4. If lastActiveDate < yesterday, reset streak to 1
    // 5. Update lastActiveDate to today
    // 6. Check for milestone bonuses (7, 14, 30 days)
    
    const result = {
      success: true,
      currentStreak: 1,
      bonusAwarded: 0,
      milestoneReached: null,
      message: 'Daily check-in recorded'
    };
    
    // Check milestones
    const milestones = {
      7: 0.50,
      14: 1.00,
      30: 2.50,
      60: 5.00,
      100: 10.00
    };
    
    if (milestones[result.currentStreak]) {
      result.bonusAwarded = milestones[result.currentStreak];
      result.milestoneReached = result.currentStreak;
      result.message = `🔥 ${result.currentStreak}-day streak! +$${result.bonusAwarded} bonus!`;
    }
    
    res.json(result);
  } catch (error) {
    console.error('Streak checkin error:', error);
    res.status(500).json({ error: 'Failed to record checkin' });
  }
});

// Get streak leaderboard
router.get('/leaderboard/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Mock leaderboard - replace with DB query
    const leaderboard = [];
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Streak leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;