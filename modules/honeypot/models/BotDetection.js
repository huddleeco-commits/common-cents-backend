const mongoose = require('mongoose');

const botDetectionSchema = new mongoose.Schema({
  ip: { type: String, required: true, index: true },
  fingerprint: { type: String, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  triggerCount: { type: Number, default: 1 },
  triggers: [{
    field: String,
    value: String,
    endpoint: String,
    timestamp: { type: Date, default: Date.now }
  }],
  banned: { type: Boolean, default: false },
  bannedAt: Date,
  banExpiresAt: Date,
  userAgent: String,
  country: String
}, { timestamps: true });

// Auto-expire bans
botDetectionSchema.index({ banExpiresAt: 1 }, { expireAfterSeconds: 0 });

// Check if IP is currently banned
botDetectionSchema.statics.isBanned = async function(ip) {
  const record = await this.findOne({ 
    ip, 
    banned: true,
    banExpiresAt: { $gt: new Date() }
  });
  return !!record;
};

module.exports = mongoose.model('BotDetection', botDetectionSchema);
