const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  // Phone verification
  phone: {
    number: String,
    countryCode: String,
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    verificationCode: String,
    codeExpiresAt: Date,
    attempts: { type: Number, default: 0 },
    lastAttempt: Date
  },
  
  // Payout methods
  payoutMethods: [{
    provider: { type: String, enum: ['paypal', 'mpesa', 'gcash', 'bank'], required: true },
    accountId: String, // email for PayPal, phone for M-Pesa/GCash
    accountName: String,
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    isPrimary: { type: Boolean, default: false },
    metadata: mongoose.Schema.Types.Mixed
  }],
  
  // Verification level
  level: { 
    type: String, 
    enum: ['none', 'phone', 'full'], 
    default: 'none' 
  },
  
  // KYC (future expansion)
  kyc: {
    status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
    submittedAt: Date,
    reviewedAt: Date,
    documents: [{
      type: { type: String },
      url: String,
      uploadedAt: Date
    }]
  }
}, { timestamps: true });

// Get primary payout method
verificationSchema.methods.getPrimaryPayout = function() {
  return this.payoutMethods.find(m => m.isPrimary) || this.payoutMethods[0];
};

// Check if user can receive payouts
verificationSchema.methods.canReceivePayouts = function() {
  return this.phone.verified && this.payoutMethods.some(m => m.verified);
};

module.exports = mongoose.model('Verification', verificationSchema);
