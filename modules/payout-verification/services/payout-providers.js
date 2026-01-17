/**
 * Payout Providers Service
 * Integrations for PayPal, M-Pesa, GCash
 */

const Verification = require('../models/Verification');

class PayoutProviders {
  constructor(config = {}) {
    this.config = config;
    this.providers = {
      paypal: new PayPalProvider(config.paypal),
      mpesa: new MPesaProvider(config.mpesa),
      gcash: new GCashProvider(config.gcash)
    };
  }

  /**
   * Add payout method for user
   */
  async addPayoutMethod(userId, provider, accountId, accountName) {
    let verification = await Verification.findOne({ userId });
    if (!verification) {
      verification = new Verification({ userId });
    }
    
    // Check if already exists
    const existing = verification.payoutMethods.find(
      m => m.provider === provider && m.accountId === accountId
    );
    if (existing) {
      return { success: false, error: 'Payout method already exists' };
    }
    
    // Add new method
    const isPrimary = verification.payoutMethods.length === 0;
    verification.payoutMethods.push({
      provider,
      accountId,
      accountName,
      verified: false,
      isPrimary
    });
    
    await verification.save();
    return { success: true, message: 'Payout method added' };
  }

  /**
   * Process payout to user
   */
  async processPayout(userId, amount, currency = 'USD') {
    const verification = await Verification.findOne({ userId });
    
    if (!verification) {
      return { success: false, error: 'User not verified', code: 'NOT_VERIFIED' };
    }
    
    if (!verification.phone.verified) {
      return { success: false, error: 'Phone not verified', code: 'PHONE_NOT_VERIFIED' };
    }
    
    const payoutMethod = verification.getPrimaryPayout();
    if (!payoutMethod) {
      return { success: false, error: 'No payout method configured', code: 'NO_PAYOUT_METHOD' };
    }
    
    const provider = this.providers[payoutMethod.provider];
    if (!provider) {
      return { success: false, error: 'Provider not available', code: 'PROVIDER_UNAVAILABLE' };
    }
    
    try {
      const result = await provider.sendPayout(payoutMethod.accountId, amount, currency);
      return {
        success: true,
        transactionId: result.transactionId,
        provider: payoutMethod.provider,
        amount,
        currency
      };
    } catch (err) {
      return { success: false, error: err.message, code: 'PAYOUT_FAILED' };
    }
  }

  /**
   * Get available providers for country
   */
  getProvidersForCountry(countryCode) {
    const available = ['paypal']; // PayPal available everywhere
    
    if (['KE', 'TZ', 'UG'].includes(countryCode)) {
      available.push('mpesa');
    }
    if (countryCode === 'PH') {
      available.push('gcash');
    }
    
    return available;
  }
}

/**
 * PayPal Provider
 */
class PayPalProvider {
  constructor(config = {}) {
    this.config = config;
  }
  
  async sendPayout(email, amount, currency) {
    // In production: use PayPal Payouts API
    console.log(`[PAYPAL] Sending ${currency} ${amount} to ${email}`);
    return { 
      transactionId: `PP-${Date.now()}`,
      status: 'pending'
    };
  }
}

/**
 * M-Pesa Provider (Kenya, Tanzania, Uganda)
 */
class MPesaProvider {
  constructor(config = {}) {
    this.config = config;
  }
  
  async sendPayout(phoneNumber, amount, currency) {
    // In production: use Safaricom M-Pesa API
    console.log(`[MPESA] Sending ${currency} ${amount} to ${phoneNumber}`);
    return {
      transactionId: `MP-${Date.now()}`,
      status: 'pending'
    };
  }
}

/**
 * GCash Provider (Philippines)
 */
class GCashProvider {
  constructor(config = {}) {
    this.config = config;
  }
  
  async sendPayout(phoneNumber, amount, currency) {
    // In production: use GCash/GInsure API
    console.log(`[GCASH] Sending ${currency} ${amount} to ${phoneNumber}`);
    return {
      transactionId: `GC-${Date.now()}`,
      status: 'pending'
    };
  }
}

module.exports = PayoutProviders;
