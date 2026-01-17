/**
 * Honeypot Service
 * Manages bot detection through hidden form fields
 */

const BotDetection = require('../models/BotDetection');

class HoneypotService {
  constructor(config = {}) {
    this.config = {
      fieldNames: config.fieldNames || ['website', 'url', 'homepage', 'company_url', 'fax_number'],
      autoBanThreshold: config.autoBanThreshold || 3,
      banDurationHours: config.banDurationHours || 24,
      ...config
    };
  }

  /**
   * Get list of honeypot field names to include in forms
   */
  getFieldNames() {
    return this.config.fieldNames;
  }

  /**
   * Check if any honeypot fields were filled (bots fill all fields)
   */
  checkFields(body) {
    const triggered = [];
    
    for (const field of this.config.fieldNames) {
      if (body[field] && body[field].toString().trim() !== '') {
        triggered.push({ field, value: body[field] });
      }
    }
    
    return {
      isBot: triggered.length > 0,
      triggered
    };
  }

  /**
   * Record a honeypot trigger and potentially ban
   */
  async recordTrigger(ip, fingerprint, userId, triggers, endpoint, userAgent) {
    try {
      let record = await BotDetection.findOne({ ip });
      
      if (record) {
        record.triggerCount += 1;
        record.triggers.push(...triggers.map(t => ({
          ...t,
          endpoint,
          timestamp: new Date()
        })));
        if (fingerprint) record.fingerprint = fingerprint;
        if (userId) record.userId = userId;
        if (userAgent) record.userAgent = userAgent;
      } else {
        record = new BotDetection({
          ip,
          fingerprint,
          userId,
          userAgent,
          triggers: triggers.map(t => ({ ...t, endpoint, timestamp: new Date() }))
        });
      }
      
      // Auto-ban if threshold reached
      if (record.triggerCount >= this.config.autoBanThreshold && !record.banned) {
        record.banned = true;
        record.bannedAt = new Date();
        record.banExpiresAt = new Date(Date.now() + this.config.banDurationHours * 60 * 60 * 1000);
      }
      
      await record.save();
      
      return {
        recorded: true,
        triggerCount: record.triggerCount,
        banned: record.banned,
        banExpiresAt: record.banExpiresAt
      };
    } catch (err) {
      console.error('Failed to record honeypot trigger:', err);
      return { recorded: false, error: err.message };
    }
  }

  /**
   * Check if IP is banned
   */
  async isBanned(ip) {
    return BotDetection.isBanned(ip);
  }

  /**
   * Get all banned IPs (for admin)
   */
  async getBannedList(limit = 100) {
    return BotDetection.find({ 
      banned: true,
      banExpiresAt: { $gt: new Date() }
    })
      .sort({ bannedAt: -1 })
      .limit(limit);
  }

  /**
   * Manually unban an IP
   */
  async unban(ip) {
    const result = await BotDetection.findOneAndUpdate(
      { ip },
      { banned: false, banExpiresAt: null },
      { new: true }
    );
    return !!result;
  }

  /**
   * Get detection stats
   */
  async getStats() {
    const [total, banned, recentTriggers] = await Promise.all([
      BotDetection.countDocuments(),
      BotDetection.countDocuments({ banned: true, banExpiresAt: { $gt: new Date() } }),
      BotDetection.countDocuments({ 
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);
    
    return { total, currentlyBanned: banned, last24Hours: recentTriggers };
  }
}

module.exports = HoneypotService;
