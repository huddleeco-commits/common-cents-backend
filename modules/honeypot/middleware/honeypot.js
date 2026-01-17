/**
 * Honeypot Middleware
 * Catches bots that fill hidden form fields
 */

const HoneypotService = require('../services/honeypot');
const FingerprintService = require('../../fraud-detection/services/fingerprint');

let honeypotService = null;

/**
 * Initialize honeypot service with config
 */
const initHoneypot = (config) => {
  honeypotService = new HoneypotService(config);
};

/**
 * Middleware to check for honeypot triggers
 */
const honeypotCheck = (options = {}) => {
  return async (req, res, next) => {
    if (!honeypotService) {
      return next();
    }
    
    const ip = req.ip || req.connection?.remoteAddress;
    
    // First check if already banned
    const banned = await honeypotService.isBanned(ip);
    if (banned) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'IP_BANNED'
      });
    }
    
    // Check honeypot fields
    const check = honeypotService.checkFields(req.body);
    
    if (check.isBot) {
      const fingerprint = FingerprintService.generate(req);
      const userId = req.user?.id;
      
      const result = await honeypotService.recordTrigger(
        ip,
        fingerprint,
        userId,
        check.triggered,
        req.originalUrl,
        req.headers['user-agent']
      );
      
      // Log for monitoring
      console.warn(`[HONEYPOT] Bot detected from ${ip}`, {
        triggered: check.triggered,
        triggerCount: result.triggerCount,
        banned: result.banned
      });
      
      // Return generic error (don't reveal detection)
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        code: 'BAD_REQUEST'
      });
    }
    
    next();
  };
};

/**
 * Get honeypot field names for frontend forms
 */
const getHoneypotFields = (req, res) => {
  if (!honeypotService) {
    return res.json({ fields: [] });
  }
  res.json({ fields: honeypotService.getFieldNames() });
};

module.exports = {
  initHoneypot,
  honeypotCheck,
  getHoneypotFields,
  getHoneypotService: () => honeypotService
};
