const express = require('express');
const router = express.Router();

const PROVIDER_CONFIG = {
  marginPercent: 35
};

// Get available surveys for user
router.get('/available/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // TODO: Call Pollfish API - mock data for now
    const surveys = [
      {
        id: 'survey_001',
        provider: 'pollfish',
        title: 'Consumer Preferences Survey',
        description: 'Share your shopping habits',
        estimatedMinutes: 5,
        payout: 0.65,
        category: 'shopping',
        available: true
      },
      {
        id: 'survey_002',
        provider: 'pollfish',
        title: 'Entertainment Feedback',
        description: 'Tell us about streaming preferences',
        estimatedMinutes: 3,
        payout: 0.40,
        category: 'entertainment',
        available: true
      },
      {
        id: 'survey_003',
        provider: 'pollfish',
        title: 'Product Testing',
        description: 'Review new product concepts',
        estimatedMinutes: 8,
        payout: 1.25,
        category: 'products',
        available: true
      }
    ];
    
    res.json({ surveys, count: surveys.length });
  } catch (error) {
    console.error('Survey fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch surveys' });
  }
});

// Start a survey
router.post('/start/:surveyId', async (req, res) => {
  try {
    const { surveyId } = req.params;
    const { userId } = req.body;
    
    // TODO: Call provider API to start survey
    res.json({
      success: true,
      surveyId,
      surveyUrl: `https://survey.provider.com/${surveyId}?user=${userId}`,
      expiresIn: 3600
    });
  } catch (error) {
    console.error('Survey start error:', error);
    res.status(500).json({ error: 'Failed to start survey' });
  }
});

// Complete a survey (webhook from provider or client callback)
router.post('/complete', async (req, res) => {
  try {
    const { userId, surveyId, providerPayout } = req.body;
    
    // Calculate user payout (provider pays you, you take cut, user gets rest)
    const userPayout = providerPayout * (1 - PROVIDER_CONFIG.marginPercent / 100);
    
    // TODO: Database operations
    // 1. Add userPayout to user balance
    // 2. Record transaction
    // 3. Update surveys_completed count
    // 4. Check for achievements
    
    res.json({
      success: true,
      earned: userPayout,
      message: `+$${userPayout.toFixed(2)} added to your balance!`
    });
  } catch (error) {
    console.error('Survey complete error:', error);
    res.status(500).json({ error: 'Failed to record completion' });
  }
});

// Get user survey history
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    // TODO: Fetch from database
    const history = [];
    
    res.json({ history, count: history.length });
  } catch (error) {
    console.error('Survey history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get survey stats for user
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // TODO: Aggregate from database
    const stats = {
      totalCompleted: 0,
      totalEarned: 0,
      averagePayout: 0,
      thisWeek: 0,
      thisMonth: 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Survey stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
