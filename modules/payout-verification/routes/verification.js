/**
 * Verification Routes
 * Phone verification and payout method management
 */

const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const { requirePhoneVerification } = require('../middleware/verified-only');
const PhoneVerifyService = require('../services/phone-verify');
const PayoutProviders = require('../services/payout-providers');
const Verification = require('../models/Verification');

let phoneService = null;
let payoutService = null;

// Initialize services
const initServices = (config) => {
  phoneService = new PhoneVerifyService(config.phone || {});
  payoutService = new PayoutProviders(config.providers || {});
};

/**
 * POST /api/verification/phone/send
 * Send verification code to phone
 */
router.post('/phone/send', auth, async (req, res) => {
  try {
    const { phoneNumber, countryCode } = req.body;
    
    if (!phoneNumber || !countryCode) {
      return res.status(400).json({ success: false, error: 'Phone number and country code required' });
    }
    
    const result = await phoneService.sendCode(req.user.id, phoneNumber, countryCode);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/verification/phone/verify
 * Verify the SMS code
 */
router.post('/phone/verify', auth, async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ success: false, error: 'Verification code required' });
    }
    
    const result = await phoneService.verifyCode(req.user.id, code);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/verification/status
 * Get user's verification status
 */
router.get('/status', auth, async (req, res) => {
  try {
    const verification = await Verification.findOne({ userId: req.user.id });
    
    if (!verification) {
      return res.json({
        success: true,
        status: {
          level: 'none',
          phoneVerified: false,
          payoutMethods: []
        }
      });
    }
    
    res.json({
      success: true,
      status: {
        level: verification.level,
        phoneVerified: verification.phone.verified,
        phoneNumber: verification.phone.verified ? 
          `***${verification.phone.number.slice(-4)}` : null,
        payoutMethods: verification.payoutMethods.map(m => ({
          provider: m.provider,
          accountId: `***${m.accountId.slice(-4)}`,
          isPrimary: m.isPrimary
        }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/verification/payout-method
 * Add a payout method
 */
router.post('/payout-method', auth, requirePhoneVerification, async (req, res) => {
  try {
    const { provider, accountId, accountName } = req.body;
    
    if (!provider || !accountId) {
      return res.status(400).json({ success: false, error: 'Provider and account ID required' });
    }
    
    const result = await payoutService.addPayoutMethod(
      req.user.id,
      provider,
      accountId,
      accountName
    );
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/verification/providers
 * Get available payout providers for user's country
 */
router.get('/providers', auth, async (req, res) => {
  const countryCode = req.query.country || req.headers['cf-ipcountry'] || 'US';
  const providers = payoutService.getProvidersForCountry(countryCode);
  res.json({ success: true, providers, country: countryCode });
});

/**
 * DELETE /api/verification/payout-method/:provider
 * Remove a payout method
 */
router.delete('/payout-method/:provider', auth, async (req, res) => {
  try {
    const verification = await Verification.findOne({ userId: req.user.id });
    
    if (!verification) {
      return res.status(404).json({ success: false, error: 'No verification record' });
    }
    
    verification.payoutMethods = verification.payoutMethods.filter(
      m => m.provider !== req.params.provider
    );
    
    await verification.save();
    res.json({ success: true, message: 'Payout method removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
module.exports.initServices = initServices;
