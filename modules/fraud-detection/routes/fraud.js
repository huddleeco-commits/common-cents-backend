/**
 * Fraud Detection Admin Routes
 * For viewing and managing fraud events
 */

const express = require('express');
const router = express.Router();
const { authenticateToken: auth, isAdmin: adminOnly } = require('../middleware/auth');
const { getFraudService } = require('../middleware/fraud-check');
const FraudEvent = require('../models/FraudEvent');

/**
 * GET /api/fraud/events
 * Get all unresolved fraud events (admin only)
 */
router.get('/events', auth, adminOnly, async (req, res) => {
  try {
    const fraudService = getFraudService();
    if (!fraudService) {
      return res.status(503).json({ success: false, error: 'Fraud service not initialized' });
    }
    
    const events = await fraudService.getUnresolvedEvents(100);
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/fraud/user/:userId
 * Get fraud events for specific user (admin only)
 */
router.get('/user/:userId', auth, adminOnly, async (req, res) => {
  try {
    const fraudService = getFraudService();
    if (!fraudService) {
      return res.status(503).json({ success: false, error: 'Fraud service not initialized' });
    }
    
    const events = await fraudService.getUserEvents(req.params.userId);
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/fraud/events/:eventId/resolve
 * Mark a fraud event as resolved (admin only)
 */
router.put('/events/:eventId/resolve', auth, adminOnly, async (req, res) => {
  try {
    const event = await FraudEvent.findByIdAndUpdate(
      req.params.eventId,
      {
        resolved: true,
        resolvedBy: req.user.id,
        resolvedAt: new Date(),
        notes: req.body.notes
      },
      { new: true }
    );
    
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/fraud/stats
 * Get fraud statistics (admin only)
 */
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [total, todayCount, bySeverity, byType] = await Promise.all([
      FraudEvent.countDocuments(),
      FraudEvent.countDocuments({ createdAt: { $gte: today } }),
      FraudEvent.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]),
      FraudEvent.aggregate([
        { $group: { _id: '$eventType', count: { $sum: 1 } } }
      ])
    ]);
    
    res.json({
      success: true,
      stats: {
        total,
        today: todayCount,
        bySeverity: Object.fromEntries(bySeverity.map(s => [s._id, s.count])),
        byType: Object.fromEntries(byType.map(t => [t._id, t.count]))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
