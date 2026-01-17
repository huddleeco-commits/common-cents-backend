const mongoose = require('mongoose');

const fraudEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventType: { 
    type: String, 
    enum: ['velocity_exceeded', 'suspicious_timing', 'duplicate_device', 'vpn_detected', 'bot_behavior', 'honeypot_triggered'],
    required: true 
  },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  details: {
    ip: String,
    userAgent: String,
    fingerprint: String,
    surveyId: String,
    completionTime: Number,
    expectedMinTime: Number,
    surveysThisHour: Number,
    surveysToday: Number
  },
  action: { type: String, enum: ['logged', 'warned', 'blocked', 'banned'], default: 'logged' },
  resolved: { type: Boolean, default: false },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
  notes: String
}, { timestamps: true });

// Indexes for fast lookups
fraudEventSchema.index({ userId: 1, createdAt: -1 });
fraudEventSchema.index({ eventType: 1, createdAt: -1 });
fraudEventSchema.index({ severity: 1, resolved: 1 });

module.exports = mongoose.model('FraudEvent', fraudEventSchema);
