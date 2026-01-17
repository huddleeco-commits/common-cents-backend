/**
 * Onboarding Routes
 * User onboarding flow API
 */

const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const OnboardingService = require('../services/onboarding');

let onboardingService = null;

// Initialize service
const initService = (config, balanceService) => {
  onboardingService = new OnboardingService(config);
  if (balanceService) {
    onboardingService.setBalanceService(balanceService);
  }
};

/**
 * GET /api/onboarding/status
 * Get user's onboarding progress
 */
router.get('/status', auth, async (req, res) => {
  try {
    const result = await onboardingService.shouldShowOnboarding(req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/onboarding/progress
 * Get detailed progress
 */
router.get('/progress', auth, async (req, res) => {
  try {
    const progress = await onboardingService.getProgress(req.user.id);
    res.json({ 
      success: true, 
      progress: onboardingService._formatProgress(progress)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/onboarding/complete/:step
 * Mark a step as completed
 */
router.post('/complete/:step', auth, async (req, res) => {
  try {
    const result = await onboardingService.completeStep(req.user.id, req.params.step);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/onboarding/profile
 * Save profile data during onboarding
 */
router.post('/profile', auth, async (req, res) => {
  try {
    const { displayName, country, timezone, interests, ageRange, gender, occupation } = req.body;
    
    const result = await onboardingService.saveProfileData(req.user.id, {
      displayName,
      country,
      timezone,
      interests,
      ageRange,
      gender,
      occupation
    });
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/onboarding/dismiss
 * Dismiss onboarding for now
 */
router.post('/dismiss', auth, async (req, res) => {
  try {
    const result = await onboardingService.dismiss(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/onboarding/rewards
 * Get available onboarding rewards
 */
router.get('/rewards', auth, async (req, res) => {
  try {
    const rewards = onboardingService.config.rewards;
    const progress = await onboardingService.getProgress(req.user.id);
    
    const rewardStatus = Object.entries(rewards).map(([step, amount]) => {
      const stepKey = Object.keys(progress.steps).find(s => 
        onboardingService._getRewardKey(s) === step
      );
      return {
        step,
        amount,
        claimed: stepKey ? progress.steps[stepKey].rewardClaimed : false
      };
    });
    
    res.json({ success: true, rewards: rewardStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
module.exports.initService = initService;
