/**
 * Main Fraud Detection Service
 * Coordinates all fraud checks and logging
 */

const FraudEvent = require('../models/FraudEvent');
const FingerprintService = require('./fingerprint');
const VelocityTracker = require('./velocity-tracker');

class FraudDetectionService {
  constructor(config = {}) {
    this.config = {
      maxSurveysPerHour: config.maxSurveysPerHour || 20,
      maxSurveysPerDay: config.maxSurveysPerDay || 100,
      minSurveyCompletionTime: config.minSurveyCompletionTime || 30, // seconds
      blockVPN: config.blockVPN !== false,
      blockDuplicateDevices: config.blockDuplicateDevices !== false,
      ...config
    };
    
    this.velocityTracker = new VelocityTracker(config.redisUrl);
    this.deviceMap = new Map(); // userId -> Set of fingerprints
  }
  
  /**
   * Run all fraud checks on a request
   */
  async checkRequest(req, userId, context = {}) {
    const results = {
      allowed: true,
      checks: [],
      riskScore: 0
    };
    
    // 1. Fingerprint check
    const fingerprint = FingerprintService.generate(req);
    const fpCheck = FingerprintService.isSuspiciousFingerprint(fingerprint, req.headers['user-agent']);
    if (fpCheck.suspicious) {
      results.checks.push({ name: 'fingerprint', passed: false, reason: fpCheck.reason });
      results.riskScore += 30;
    } else {
      results.checks.push({ name: 'fingerprint', passed: true });
    }
    
    // 2. Velocity check
    const velocityResult = await this.velocityTracker.checkLimits(userId, {
      maxPerHour: this.config.maxSurveysPerHour,
      maxPerDay: this.config.maxSurveysPerDay
    });
    if (!velocityResult.allowed) {
      results.checks.push({ name: 'velocity', passed: false, violations: velocityResult.violations });
      results.riskScore += 50;
      results.allowed = false;
    } else {
      results.checks.push({ name: 'velocity', passed: true, counts: velocityResult.counts });
    }
    
    // 3. Completion time check (if survey context provided)
    if (context.surveyStartTime && context.surveyEndTime) {
      const completionTime = (context.surveyEndTime - context.surveyStartTime) / 1000;
      const expectedMin = context.expectedMinTime || this.config.minSurveyCompletionTime;
      
      if (completionTime < expectedMin) {
        results.checks.push({ 
          name: 'timing', 
          passed: false, 
          completionTime,
          expectedMin
        });
        results.riskScore += 40;
        
        // Log suspicious timing event
        await this.logEvent(userId, 'suspicious_timing', 'high', {
          surveyId: context.surveyId,
          completionTime,
          expectedMinTime: expectedMin,
          ip: req.ip,
          fingerprint
        });
      } else {
        results.checks.push({ name: 'timing', passed: true, completionTime });
      }
    }
    
    // 4. Duplicate device check
    if (this.config.blockDuplicateDevices) {
      const isDuplicate = await this.checkDuplicateDevice(userId, fingerprint);
      if (isDuplicate.found && isDuplicate.otherUserId !== userId) {
        results.checks.push({ name: 'duplicate_device', passed: false });
        results.riskScore += 60;
      } else {
        results.checks.push({ name: 'duplicate_device', passed: true });
      }
    }
    
    // Determine final allowed status
    if (results.riskScore >= 50) {
      results.allowed = false;
    }
    
    return results;
  }
  
  /**
   * Check if device fingerprint is used by another user
   */
  async checkDuplicateDevice(userId, fingerprint) {
    // In production, this should use Redis or DB
    for (const [existingUserId, fingerprints] of this.deviceMap) {
      if (fingerprints.has(fingerprint)) {
        return { found: true, otherUserId: existingUserId };
      }
    }
    
    // Register this device for user
    if (!this.deviceMap.has(userId)) {
      this.deviceMap.set(userId, new Set());
    }
    this.deviceMap.get(userId).add(fingerprint);
    
    return { found: false };
  }
  
  /**
   * Record survey completion for velocity tracking
   */
  async recordSurveyCompletion(userId) {
    return this.velocityTracker.increment(userId, 'survey');
  }
  
  /**
   * Log a fraud event to database
   */
  async logEvent(userId, eventType, severity, details) {
    try {
      const event = new FraudEvent({
        userId,
        eventType,
        severity,
        details,
        action: severity === 'critical' ? 'blocked' : 'logged'
      });
      await event.save();
      return event;
    } catch (err) {
      console.error('Failed to log fraud event:', err);
      return null;
    }
  }
  
  /**
   * Get fraud events for a user
   */
  async getUserEvents(userId, limit = 50) {
    return FraudEvent.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }
  
  /**
   * Get all unresolved high-severity events (for admin)
   */
  async getUnresolvedEvents(limit = 100) {
    return FraudEvent.find({ 
      resolved: false,
      severity: { $in: ['high', 'critical'] }
    })
      .populate('userId', 'email username')
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}

module.exports = FraudDetectionService;
