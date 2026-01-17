/**
 * Phone Verification Service
 * SMS-based verification using Twilio or similar
 */

const Verification = require('../models/Verification');

class PhoneVerifyService {
  constructor(config = {}) {
    this.config = {
      codeLength: config.codeLength || 6,
      codeExpiryMinutes: config.codeExpiryMinutes || 10,
      maxAttempts: config.maxAttempts || 3,
      cooldownMinutes: config.cooldownMinutes || 30,
      ...config
    };
    
    // In production, use Twilio, Vonage, or similar
    this.smsProvider = config.smsProvider || null;
  }

  /**
   * Generate verification code
   */
  generateCode() {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < this.config.codeLength; i++) {
      code += digits[Math.floor(Math.random() * 10)];
    }
    return code;
  }

  /**
   * Send verification code to phone
   */
  async sendCode(userId, phoneNumber, countryCode) {
    // Get or create verification record
    let verification = await Verification.findOne({ userId });
    if (!verification) {
      verification = new Verification({ userId });
    }
    
    // Check cooldown
    if (verification.phone.lastAttempt) {
      const cooldownEnd = new Date(verification.phone.lastAttempt.getTime() + this.config.cooldownMinutes * 60 * 1000);
      if (verification.phone.attempts >= this.config.maxAttempts && new Date() < cooldownEnd) {
        const waitMinutes = Math.ceil((cooldownEnd - new Date()) / 60000);
        return { 
          success: false, 
          error: `Too many attempts. Try again in ${waitMinutes} minutes.`,
          code: 'COOLDOWN'
        };
      }
    }
    
    // Reset attempts if cooldown passed
    if (verification.phone.attempts >= this.config.maxAttempts) {
      verification.phone.attempts = 0;
    }
    
    // Generate and store code
    const code = this.generateCode();
    verification.phone.number = phoneNumber;
    verification.phone.countryCode = countryCode;
    verification.phone.verificationCode = code;
    verification.phone.codeExpiresAt = new Date(Date.now() + this.config.codeExpiryMinutes * 60 * 1000);
    verification.phone.attempts += 1;
    verification.phone.lastAttempt = new Date();
    
    await verification.save();
    
    // Send SMS
    const fullNumber = `${countryCode}${phoneNumber}`;
    const sent = await this._sendSMS(fullNumber, `Your verification code is: ${code}`);
    
    if (!sent.success) {
      return { success: false, error: 'Failed to send SMS', code: 'SMS_FAILED' };
    }
    
    return { 
      success: true, 
      message: 'Verification code sent',
      expiresIn: this.config.codeExpiryMinutes * 60
    };
  }

  /**
   * Verify the code
   */
  async verifyCode(userId, code) {
    const verification = await Verification.findOne({ userId });
    
    if (!verification || !verification.phone.verificationCode) {
      return { success: false, error: 'No pending verification', code: 'NO_PENDING' };
    }
    
    if (new Date() > verification.phone.codeExpiresAt) {
      return { success: false, error: 'Code expired', code: 'EXPIRED' };
    }
    
    if (verification.phone.verificationCode !== code) {
      return { success: false, error: 'Invalid code', code: 'INVALID' };
    }
    
    // Mark as verified
    verification.phone.verified = true;
    verification.phone.verifiedAt = new Date();
    verification.phone.verificationCode = null;
    verification.phone.codeExpiresAt = null;
    verification.phone.attempts = 0;
    verification.level = 'phone';
    
    await verification.save();
    
    return { success: true, message: 'Phone verified successfully' };
  }

  /**
   * Internal SMS sending (override in production)
   */
  async _sendSMS(phoneNumber, message) {
    if (this.smsProvider) {
      try {
        await this.smsProvider.send(phoneNumber, message);
        return { success: true };
      } catch (err) {
        console.error('SMS send failed:', err);
        return { success: false, error: err.message };
      }
    }
    
    // Dev mode: log to console
    console.log(`[DEV SMS] To: ${phoneNumber} | Message: ${message}`);
    return { success: true, dev: true };
  }
}

module.exports = PhoneVerifyService;
