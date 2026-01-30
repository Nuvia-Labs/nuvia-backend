const mongoose = require('mongoose');

const questSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  cadence: {
    type: String,
    enum: ['daily', 'weekly', 'one-time'],
    default: 'daily',
    index: true
  },
  startAt: {
    type: Date,
    default: Date.now
  },
  endAt: {
    type: Date,
    default: null // null means no end date
  },
  rules: {
    // Flexible JSON structure for quest requirements
    type: {
      type: String,
      enum: [
        'event_count', // Complete X events of a type
        'xp_threshold', // Reach X XP
        'action_once', // Do action once
        'deposit_amount', // Deposit X amount
        'custom' // Custom logic
      ],
      required: true
    },
    eventType: String, // For event_count type
    targetCount: Number, // For event_count type
    targetAmount: String, // For deposit_amount type
    targetXP: Number, // For xp_threshold type
    customLogic: mongoose.Schema.Types.Mixed // For custom type
  },
  rewardXP: {
    type: Number,
    required: true,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  metadata: {
    icon: String,
    category: String,
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'easy'
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    extra: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
questSchema.index({ cadence: 1, isActive: 1 });
questSchema.index({ startAt: 1, endAt: 1 });

// Static method to get active quests
questSchema.statics.getActiveQuests = async function(cadence = null) {
  const now = new Date();
  const query = {
    isActive: true,
    startAt: { $lte: now },
    $or: [
      { endAt: null },
      { endAt: { $gte: now } }
    ]
  };
  
  if (cadence) {
    query.cadence = cadence;
  }
  
  return this.find(query).sort({ 'metadata.displayOrder': 1, createdAt: 1 });
};

// Static method to get today's daily quests
questSchema.statics.getTodayQuests = async function() {
  return this.getActiveQuests('daily');
};

// Instance method to check if quest is currently active
questSchema.methods.isCurrentlyActive = function() {
  const now = new Date();
  
  if (!this.isActive) return false;
  if (this.startAt > now) return false;
  if (this.endAt && this.endAt < now) return false;
  
  return true;
};

const Quest = mongoose.model('Quest', questSchema);

module.exports = Quest;
