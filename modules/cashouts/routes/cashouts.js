const express = require('express');
const router = express.Router();

const CASHOUT_CONFIG = {
  minimumAmount: 1.00,
  maximumDaily: 50.00,
  maximumWeekly: 200.00,
  methods: [
    { id: 'paypal', name: 'PayPal', minAmount: 1.00, fee: 0, processingTime: 'Instant - 24 hours' },
    { id: 'cashapp', name: 'Cash App', minAmount: 1.00, fee: 0, processingTime: 'Instant - 24 hours' },
    { id: 'venmo', name: 'Venmo', minAmount: 5.00, fee: 0, processingTime: 'Instant - 24 hours' },
    { id: 'crypto_usdc', name: 'USDC (Crypto)', minAmount: 10.00, fee: 0, processingTime: 'Instant' },
    { id: 'amazon', name: 'Amazon Gift Card', minAmount: 5.00, fee: 0, processingTime: 'Instant' }
  ]
};

// Get cashout options and user limits
router.get('/options/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // TODO: Get user balance and cashout history from DB
    const userBalance = 0;
    const todayCashouts = 0;
    const weekCashouts = 0;
    
    res.json({
      balance: userBalance,
      methods: CASHOUT_CONFIG.methods,
      limits: {
        minimum: CASHOUT_CONFIG.minimumAmount,
        dailyRemaining: CASHOUT_CONFIG.maximumDaily - todayCashouts,
        weeklyRemaining: CASHOUT_CONFIG.maximumWeekly - weekCashouts
      }
    });
  } catch (error) {
    console.error('Cashout options error:', error);
    res.status(500).json({ error: 'Failed to fetch options' });
  }
});

// Request a cashout
router.post('/request', async (req, res) => {
  try {
    const { userId, amount, method, destination } = req.body;
    
    // Validation
    if (amount < CASHOUT_CONFIG.minimumAmount) {
      return res.status(400).json({ error: `Minimum cashout is $${CASHOUT_CONFIG.minimumAmount}` });
    }
    
    const methodConfig = CASHOUT_CONFIG.methods.find(m => m.id === method);
    if (!methodConfig) {
      return res.status(400).json({ error: 'Invalid cashout method' });
    }
    
    if (amount < methodConfig.minAmount) {
      return res.status(400).json({ error: `Minimum for ${methodConfig.name} is $${methodConfig.minAmount}` });
    }
    
    // TODO: Database operations
    // 1. Check user balance >= amount
    // 2. Check daily/weekly limits
    // 3. Deduct from balance
    // 4. Create cashout record with status 'pending'
    // 5. Queue for processing (PayPal API, etc.)
    
    const cashoutId = 'co_' + Date.now();
    
    res.json({
      success: true,
      cashoutId,
      amount,
      method: methodConfig.name,
      destination,
      fee: methodConfig.fee,
      netAmount: amount - methodConfig.fee,
      status: 'pending',
      estimatedTime: methodConfig.processingTime,
      message: `Cashout of $${amount.toFixed(2)} to ${methodConfig.name} is being processed!`
    });
  } catch (error) {
    console.error('Cashout request error:', error);
    res.status(500).json({ error: 'Failed to process cashout' });
  }
});

// Get cashout history
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    // TODO: Fetch from database
    const history = [];
    
    res.json({ history, count: history.length });
  } catch (error) {
    console.error('Cashout history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get cashout status
router.get('/status/:cashoutId', async (req, res) => {
  try {
    const { cashoutId } = req.params;
    
    // TODO: Fetch from database
    res.json({
      cashoutId,
      status: 'pending',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cashout status error:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// Admin: Process pending cashouts
router.post('/admin/process/:cashoutId', async (req, res) => {
  try {
    const { cashoutId } = req.params;
    const { status, transactionId } = req.body;
    
    // TODO: Update cashout status in database
    // If approved, trigger actual payment via PayPal/Stripe/etc.
    
    res.json({
      success: true,
      cashoutId,
      status,
      transactionId
    });
  } catch (error) {
    console.error('Cashout process error:', error);
    res.status(500).json({ error: 'Failed to process' });
  }
});

module.exports = router;
