const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'connect_wallet',
      'deposit',
      'supply',
      'borrow',
      'swap',
      'claim_faucet',
      'complete_quest',
      'referral_verified',
      'select_strategy',
      'claim_reward',
      'other'
    ],
    index: true
  },
  dedupKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  metadata: {
    // For onchain events
    txHash: String,
    chainId: Number,
    contractAddress: String,
    blockNumber: Number,
    
    // For financial events
    amount: String, // Store as string to avoid precision issues
    tokenAddress: String,
    tokenSymbol: String,
    protocol: String,
    
    // For quest events
    questId: mongoose.Schema.Types.ObjectId,
    
    // For referral events
    referralId: mongoose.Schema.Types.ObjectId,
    
    // Additional data
    extra: mongoose.Schema.Types.Mixed
  },
  occurredAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'processed', 'failed', 'rejected'],
    default: 'pending',
    index: true
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  processedAt: {
    type: Date,
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
eventSchema.index({ userId: 1, type: 1 });
eventSchema.index({ userId: 1, occurredAt: -1 });
eventSchema.index({ status: 1, createdAt: 1 });
eventSchema.index({ 'metadata.txHash': 1 });

// Static method to create event with dedup key
eventSchema.statics.createEvent = async function(userId, type, metadata = {}, dedupKey = null) {
  // Generate dedup key if not provided
  if (!dedupKey) {
    if (metadata.txHash) {
      // For onchain events: userId + type + txHash
      dedupKey = `${userId}_${type}_${metadata.txHash}`;
    } else {
      // For offchain events: userId + type + timestamp
      dedupKey = `${userId}_${type}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
  }
  
  try {
    const event = await this.create({
      userId,
      type,
      dedupKey,
      metadata,
      occurredAt: metadata.occurredAt || new Date()
    });
    
    return event;
  } catch (error) {
    // Check if it's a duplicate key error
    if (error.code === 11000) {
      throw new Error('Event already exists (duplicate)');
    }
    throw error;
  }
};

// Static method to get user events
eventSchema.statics.getUserEvents = async function(userId, options = {}) {
  const {
    type = null,
    status = null,
    limit = 50,
    skip = 0,
    startDate = null,
    endDate = null
  } = options;
  
  const query = { userId };
  
  if (type) query.type = type;
  if (status) query.status = status;
  
  if (startDate || endDate) {
    query.occurredAt = {};
    if (startDate) query.occurredAt.$gte = new Date(startDate);
    if (endDate) query.occurredAt.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .sort({ occurredAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Instance method to mark as verified
eventSchema.methods.markVerified = async function() {
  this.status = 'verified';
  this.verifiedAt = new Date();
  return this.save();
};

// Instance method to mark as processed
eventSchema.methods.markProcessed = async function() {
  this.status = 'processed';
  this.processedAt = new Date();
  return this.save();
};

// Instance method to mark as failed
eventSchema.methods.markFailed = async function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  return this.save();
};

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
