/**
 * Verified-Only Middleware
 * Requires phone verification for payout routes
 */

const Verification = require('../models/Verification');

/**
 * Require phone verification
 */
const requirePhoneVerification = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  const verification = await Verification.findOne({ userId: req.user.id });
  
  if (!verification || !verification.phone.verified) {
    return res.status(403).json({
      success: false,
      error: 'Phone verification required',
      code: 'PHONE_VERIFICATION_REQUIRED'
    });
  }
  
  req.verification = verification;
  next();
};

/**
 * Require payout method configured
 */
const requirePayoutMethod = async (req, res, next) => {
  if (!req.verification) {
    const verification = await Verification.findOne({ userId: req.user.id });
    req.verification = verification;
  }
  
  if (!req.verification || req.verification.payoutMethods.length === 0) {
    return res.status(403).json({
      success: false,
      error: 'Payout method required',
      code: 'PAYOUT_METHOD_REQUIRED'
    });
  }
  
  next();
};

/**
 * Full payout verification (phone + method)
 */
const requireFullVerification = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  const verification = await Verification.findOne({ userId: req.user.id });
  
  if (!verification) {
    return res.status(403).json({
      success: false,
      error: 'Verification required',
      code: 'NOT_VERIFIED'
    });
  }
  
  if (!verification.phone.verified) {
    return res.status(403).json({
      success: false,
      error: 'Phone verification required',
      code: 'PHONE_VERIFICATION_REQUIRED'
    });
  }
  
  if (verification.payoutMethods.length === 0) {
    return res.status(403).json({
      success: false,
      error: 'Payout method required',
      code: 'PAYOUT_METHOD_REQUIRED'
    });
  }
  
  req.verification = verification;
  next();
};

module.exports = {
  requirePhoneVerification,
  requirePayoutMethod,
  requireFullVerification
};
