/**
 * Fraud Check Middleware
 * Attach to routes that need fraud protection
 */

const FraudDetectionService = require('../services/fraud-detection');

let fraudService = null;

/**
 * Initialize fraud service with config from brain.json
 */
const initFraudService = (config) => {
  fraudService = new FraudDetectionService(config);
};

/**
 * Middleware to check for fraud on protected routes
 */
const fraudCheck = (options = {}) => {
  return async (req, res, next) => {
    // Skip if fraud detection not initialized
    if (!fraudService) {
      console.warn('Fraud service not initialized, skipping check');
      return next();
    }
    
    // Skip if no authenticated user
    if (!req.user || !req.user.id) {
      return next();
    }
    
    try {
      const context = {
        surveyId: req.body.surveyId || req.params.surveyId,
        surveyStartTime: req.body.startTime ? new Date(req.body.startTime) : null,
        surveyEndTime: new Date(),
        expectedMinTime: req.body.expectedMinTime || options.minCompletionTime
      };
      
      const result = await fraudService.checkRequest(req, req.user.id, context);
      
      // Attach result to request for downstream use
      req.fraudCheck = result;
      
      if (!result.allowed) {
        return res.status(403).json({
          success: false,
          error: 'Request blocked by fraud detection',
          code: 'FRAUD_DETECTED',
          riskScore: result.riskScore
        });
      }
      
      next();
    } catch (err) {
      console.error('Fraud check error:', err);
      // Don't block on errors, but log them
      next();
    }
  };
};

/**
 * Middleware to record survey completion
 */
const recordCompletion = async (req, res, next) => {
  if (!fraudService || !req.user) return next();
  
  try {
    await fraudService.recordSurveyCompletion(req.user.id);
  } catch (err) {
    console.error('Failed to record completion:', err);
  }
  next();
};

module.exports = {
  initFraudService,
  fraudCheck,
  recordCompletion,
  getFraudService: () => fraudService
};
