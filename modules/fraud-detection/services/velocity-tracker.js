/**
 * Velocity Tracker Service
 * Monitors rate of actions per user to detect abuse
 */

const Redis = require('ioredis');

class VelocityTracker {
  constructor(redisUrl) {
    this.redis = redisUrl ? new Redis(redisUrl) : null;
    this.memoryStore = new Map(); // Fallback if no Redis
  }
  
  /**
   * Get cache key for user action tracking
   */
  _getKey(userId, action, window) {
    return `velocity:${userId}:${action}:${window}`;
  }
  
  /**
   * Increment action count for user
   */
  async increment(userId, action = 'survey') {
    const hourKey = this._getKey(userId, action, this._getHourWindow());
    const dayKey = this._getKey(userId, action, this._getDayWindow());
    
    if (this.redis) {
      const pipeline = this.redis.pipeline();
      pipeline.incr(hourKey);
      pipeline.expire(hourKey, 3600); // 1 hour TTL
      pipeline.incr(dayKey);
      pipeline.expire(dayKey, 86400); // 24 hour TTL
      const results = await pipeline.exec();
      return {
        hourCount: results[0][1],
        dayCount: results[2][1]
      };
    } else {
      // Memory fallback
      const hourCount = (this.memoryStore.get(hourKey) || 0) + 1;
      const dayCount = (this.memoryStore.get(dayKey) || 0) + 1;
      this.memoryStore.set(hourKey, hourCount);
      this.memoryStore.set(dayKey, dayCount);
      return { hourCount, dayCount };
    }
  }
  
  /**
   * Get current counts for user
   */
  async getCounts(userId, action = 'survey') {
    const hourKey = this._getKey(userId, action, this._getHourWindow());
    const dayKey = this._getKey(userId, action, this._getDayWindow());
    
    if (this.redis) {
      const [hourCount, dayCount] = await this.redis.mget(hourKey, dayKey);
      return {
        hourCount: parseInt(hourCount) || 0,
        dayCount: parseInt(dayCount) || 0
      };
    } else {
      return {
        hourCount: this.memoryStore.get(hourKey) || 0,
        dayCount: this.memoryStore.get(dayKey) || 0
      };
    }
  }
  
  /**
   * Check if user exceeds velocity limits
   */
  async checkLimits(userId, limits = {}) {
    const { maxPerHour = 20, maxPerDay = 100 } = limits;
    const counts = await this.getCounts(userId);
    
    const violations = [];
    
    if (counts.hourCount >= maxPerHour) {
      violations.push({
        type: 'hourly_limit',
        current: counts.hourCount,
        limit: maxPerHour
      });
    }
    
    if (counts.dayCount >= maxPerDay) {
      violations.push({
        type: 'daily_limit',
        current: counts.dayCount,
        limit: maxPerDay
      });
    }
    
    return {
      allowed: violations.length === 0,
      violations,
      counts
    };
  }
  
  _getHourWindow() {
    const now = new Date();
    return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`;
  }
  
  _getDayWindow() {
    const now = new Date();
    return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
  }
}

module.exports = VelocityTracker;
