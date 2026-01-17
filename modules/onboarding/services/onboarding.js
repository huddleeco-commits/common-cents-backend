/**
 * Onboarding Service
 * Manages user onboarding flow and rewards
 */

const OnboardingProgress = require('../models/OnboardingProgress');

class OnboardingService {
  constructor(config = {}) {
    this.config = {
      steps: config.steps || ['welcome', 'profile', 'verify_phone', 'first_survey', 'payout_setup'],
      rewards: config.rewards || {
        welcome: 0.50,
        profile_complete: 1.00,
        phone_verified: 2.00,
        first_survey: 0,
        payout_setup: 0.50
      },
      skipAllowed: config.skipAllowed || false,
      ...config
    };
    
    // Balance service injection (set externally)
    this.balanceService = null;
  }

  /**
   * Set balance service for reward crediting
   */
  setBalanceService(service) {
    this.balanceService = service;
  }

  /**
   * Get or create onboarding progress for user
   */
  async getProgress(userId) {
    let progress = await OnboardingProgress.findOne({ userId });
    
    if (!progress) {
      progress = new OnboardingProgress({ userId });
      await progress.save();
    }
    
    return progress;
  }

  /**
   * Complete a step and award bonus if applicable
   */
  async completeStep(userId, stepName) {
    const progress = await this.getProgress(userId);
    
    // Check if valid step
    if (!progress.steps[stepName]) {
      return { success: false, error: 'Invalid step' };
    }
    
    // Check if already completed
    if (progress.steps[stepName].completed) {
      return { 
        success: true, 
        alreadyCompleted: true,
        progress: this._formatProgress(progress)
      };
    }
    
    // Mark step completed
    progress.steps[stepName].completed = true;
    progress.steps[stepName].completedAt = new Date();
    progress.lastActivity = new Date();
    
    // Calculate new progress
    progress.updateProgress();
    
    // Award bonus if not claimed
    let rewardAmount = 0;
    const rewardKey = this._getRewardKey(stepName);
    
    if (this.config.rewards[rewardKey] && !progress.steps[stepName].rewardClaimed) {
      rewardAmount = this.config.rewards[rewardKey];
      
      if (rewardAmount > 0 && this.balanceService) {
        await this.balanceService.credit(userId, rewardAmount, `Onboarding: ${stepName}`);
        progress.steps[stepName].rewardClaimed = true;
        progress.totalRewardsEarned += rewardAmount;
      }
    }
    
    await progress.save();
    
    return {
      success: true,
      stepCompleted: stepName,
      rewardEarned: rewardAmount,
      nextStep: progress.getNextStep(),
      progress: this._formatProgress(progress)
    };
  }

  /**
   * Save profile data from onboarding
   */
  async saveProfileData(userId, profileData) {
    const progress = await this.getProgress(userId);
    
    progress.profileData = {
      ...progress.profileData,
      ...profileData
    };
    progress.lastActivity = new Date();
    
    await progress.save();
    
    // Auto-complete profile step if enough data
    const requiredFields = ['displayName', 'country'];
    const hasRequired = requiredFields.every(f => progress.profileData[f]);
    
    if (hasRequired && !progress.steps.profile.completed) {
      return this.completeStep(userId, 'profile');
    }
    
    return { success: true, progress: this._formatProgress(progress) };
  }

  /**
   * Dismiss onboarding (user clicked "skip" or "do later")
   */
  async dismiss(userId) {
    const progress = await this.getProgress(userId);
    progress.dismissedAt = new Date();
    await progress.save();
    return { success: true };
  }

  /**
   * Check if user should see onboarding
   */
  async shouldShowOnboarding(userId) {
    const progress = await this.getProgress(userId);
    
    // Don't show if fully completed
    if (progress.fullyCompleted) {
      return { show: false, reason: 'completed' };
    }
    
    // Don't show if dismissed in last 24 hours
    if (progress.dismissedAt) {
      const hoursSinceDismiss = (Date.now() - progress.dismissedAt) / (1000 * 60 * 60);
      if (hoursSinceDismiss < 24) {
        return { show: false, reason: 'dismissed', hoursRemaining: Math.ceil(24 - hoursSinceDismiss) };
      }
    }
    
    return { 
      show: true, 
      currentStep: progress.currentStep,
      progress: this._formatProgress(progress)
    };
  }

  /**
   * Get reward key for step
   */
  _getRewardKey(stepName) {
    const mapping = {
      welcome: 'welcome',
      profile: 'profile_complete',
      verify_phone: 'phone_verified',
      first_survey: 'first_survey',
      payout_setup: 'payout_setup'
    };
    return mapping[stepName] || stepName;
  }

  /**
   * Format progress for API response
   */
  _formatProgress(progress) {
    return {
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
      totalSteps: progress.totalSteps,
      percentComplete: progress.percentComplete,
      fullyCompleted: progress.fullyCompleted,
      totalRewardsEarned: progress.totalRewardsEarned,
      steps: Object.entries(progress.steps).map(([name, data]) => ({
        name,
        completed: data.completed,
        rewardClaimed: data.rewardClaimed
      }))
    };
  }
}

module.exports = OnboardingService;
