const mongoose = require('mongoose');

const onboardingProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  // Step completion
  steps: {
    welcome: { completed: { type: Boolean, default: false }, completedAt: Date, rewardClaimed: { type: Boolean, default: false } },
    profile: { completed: { type: Boolean, default: false }, completedAt: Date, rewardClaimed: { type: Boolean, default: false } },
    verify_phone: { completed: { type: Boolean, default: false }, completedAt: Date, rewardClaimed: { type: Boolean, default: false } },
    first_survey: { completed: { type: Boolean, default: false }, completedAt: Date, rewardClaimed: { type: Boolean, default: false } },
    payout_setup: { completed: { type: Boolean, default: false }, completedAt: Date, rewardClaimed: { type: Boolean, default: false } }
  },
  
  // Overall progress
  currentStep: { type: String, default: 'welcome' },
  completedSteps: { type: Number, default: 0 },
  totalSteps: { type: Number, default: 5 },
  percentComplete: { type: Number, default: 0 },
  
  // Completion status
  fullyCompleted: { type: Boolean, default: false },
  completedAt: Date,
  
  // Rewards tracking
  totalRewardsEarned: { type: Number, default: 0 },
  
  // User engagement
  firstVisit: { type: Date, default: Date.now },
  lastActivity: Date,
  dismissedAt: Date,
  
  // Profile data collected during onboarding
  profileData: {
    displayName: String,
    country: String,
    timezone: String,
    interests: [String],
    ageRange: String,
    gender: String,
    occupation: String
  }
}, { timestamps: true });

// Calculate percent complete
onboardingProgressSchema.methods.updateProgress = function() {
  const stepNames = Object.keys(this.steps);
  let completed = 0;
  let nextStep = null;
  
  for (const step of stepNames) {
    if (this.steps[step].completed) {
      completed++;
    } else if (!nextStep) {
      nextStep = step;
    }
  }
  
  this.completedSteps = completed;
  this.percentComplete = Math.round((completed / stepNames.length) * 100);
  this.currentStep = nextStep || 'complete';
  this.fullyCompleted = completed === stepNames.length;
  
  if (this.fullyCompleted && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  return this;
};

// Get next incomplete step
onboardingProgressSchema.methods.getNextStep = function() {
  const stepOrder = ['welcome', 'profile', 'verify_phone', 'first_survey', 'payout_setup'];
  for (const step of stepOrder) {
    if (!this.steps[step].completed) {
      return step;
    }
  }
  return null;
};

module.exports = mongoose.model('OnboardingProgress', onboardingProgressSchema);
