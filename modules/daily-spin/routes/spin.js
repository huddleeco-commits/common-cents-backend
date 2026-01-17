const express = require('express');
const router = express.Router();

// Spin wheel configuration
const SPIN_CONFIG = {
  prizes: [
    { value: 0.01, label: '$0.01', weight: 25, color: '#4ade80' },
    { value: 0.05, label: '$0.05', weight: 30, color: '#22d3ee' },
    { value: 0.10, label: '$0.10', weight: 25, color: '#a78bfa' },
    { value: 0.25, label: '$0.25', weight: 12, color: '#f472b6' },
    { value: 0.50, label: '$0.50', weight: 5, color: '#fb923c' },
    { value: 1.00, label: '$1.00', weight: 2.5, color: '#facc15' },
    { value: 5.00, label: '$5.00 JACKPOT', weight: 0.5, color: '#ef4444' }
  ],
  cooldownHours: 24
};

// Get spin status
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // TODO: Check database for last spin time
    const lastSpin = null; // Replace with DB query
    const now = new Date();
    
    let canSpin = true;
    let nextSpinAt = null;
    let timeRemaining = 0;
    
    if (lastSpin) {
      const cooldownEnd = new Date(lastSpin.getTime() + (SPIN_CONFIG.cooldownHours * 60 * 60 * 1000));
      if (now < cooldownEnd) {
        canSpin = false;
        nextSpinAt = cooldownEnd.toISOString();
        timeRemaining = Math.ceil((cooldownEnd - now) / 1000);
      }
    }
    
    res.json({
      canSpin,
      nextSpinAt,
      timeRemaining,
      prizes: SPIN_CONFIG.prizes.map(p => ({ label: p.label, color: p.color }))
    });
  } catch (error) {
    console.error('Spin status error:', error);
    res.status(500).json({ error: 'Failed to get spin status' });
  }
});

// Perform spin
router.post('/spin/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // TODO: Check cooldown in database
    // For now, always allow
    
    // Weighted random selection
    const totalWeight = SPIN_CONFIG.prizes.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedPrize = SPIN_CONFIG.prizes[0];
    
    for (const prize of SPIN_CONFIG.prizes) {
      random -= prize.weight;
      if (random <= 0) {
        selectedPrize = prize;
        break;
      }
    }
    
    // TODO: Save to database
    // 1. Record spin timestamp
    // 2. Add winnings to user balance
    // 3. Create transaction record
    
    const prizeIndex = SPIN_CONFIG.prizes.findIndex(p => p.value === selectedPrize.value);
    
    res.json({
      success: true,
      prize: {
        value: selectedPrize.value,
        label: selectedPrize.label,
        index: prizeIndex
      },
      message: `🎉 You won ${selectedPrize.label}!`,
      nextSpinAt: new Date(Date.now() + (SPIN_CONFIG.cooldownHours * 60 * 60 * 1000)).toISOString()
    });
  } catch (error) {
    console.error('Spin error:', error);
    res.status(500).json({ error: 'Failed to spin' });
  }
});

// Get spin history
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    // TODO: Fetch from database
    const history = [];
    
    res.json(history);
  } catch (error) {
    console.error('Spin history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;