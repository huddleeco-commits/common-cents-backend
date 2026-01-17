/**
 * Device Fingerprinting Service
 * Creates unique device identifiers from request metadata
 */

const crypto = require('crypto');

class FingerprintService {
  /**
   * Generate a device fingerprint from request headers
   */
  static generate(req) {
    const components = [
      req.headers['user-agent'] || '',
      req.headers['accept-language'] || '',
      req.headers['accept-encoding'] || '',
      req.headers['accept'] || '',
      req.ip || req.connection?.remoteAddress || '',
      req.headers['sec-ch-ua'] || '',
      req.headers['sec-ch-ua-platform'] || '',
      req.headers['sec-ch-ua-mobile'] || ''
    ];
    
    const raw = components.join('|');
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
  }
  
  /**
   * Generate fingerprint from client-side data (passed in body)
   */
  static generateFromClient(clientData) {
    if (!clientData) return null;
    
    const components = [
      clientData.screenResolution || '',
      clientData.timezone || '',
      clientData.language || '',
      clientData.platform || '',
      clientData.cookiesEnabled || '',
      clientData.canvas || '',
      clientData.webgl || '',
      clientData.fonts || ''
    ];
    
    const raw = components.join('|');
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
  }
  
  /**
   * Check if fingerprint matches known bot patterns
   */
  static isSuspiciousFingerprint(fingerprint, userAgent) {
    // Headless browser detection
    const botPatterns = [
      /headless/i,
      /phantom/i,
      /selenium/i,
      /webdriver/i,
      /puppeteer/i,
      /playwright/i
    ];
    
    if (userAgent && botPatterns.some(p => p.test(userAgent))) {
      return { suspicious: true, reason: 'bot_user_agent' };
    }
    
    // Missing expected headers often indicates automation
    if (!userAgent || userAgent.length < 20) {
      return { suspicious: true, reason: 'missing_user_agent' };
    }
    
    return { suspicious: false };
  }
}

module.exports = FingerprintService;
