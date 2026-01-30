const mongoose = require('mongoose');

const questProgressSchema = new mongoose.Schema({
  questId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quest',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  progressValue: {
    type: Number,
    default: 0,
    min: 0
  },
  isCompleted: {
    type: Boolean,
    default: false,
    index: true
  },
  isClaimed: {
    type: Boolean,
    default: false,
    index: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  claimedAt: {
    type: Date,
    default: null
  },
  lastEventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null
  },
  // For daily/weekly quests, track the period
  periodStart: {
    type: Date,
    default: null
  },
  periodEnd: {
    type: Date,
    default: null
  },
  metadata: {
    streak: {
      type: Number,
      default: 0
    },
    extra: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound indexes
questProgressSchema.index({ userId: 1, questId: 1 });
questProgressSchema.index({ userId: 1, isCompleted: 1 });
questProgressSchema.index({ userId: 1, isClaimed: 1 });
questProgressSchema.index({ questId: 1, isCompleted: 1 });

// Static method to get or create progress
questProgressSchema.statics.getOrCreate = async function(userId, questId, periodStart = null, periodEnd = null) {
  const Quest = mongoose.model('Quest');
  const quest = await Quest.findById(questId);
  
  if (!quest) {
    throw new Error('Quest not found');
  }
  
  // For daily/weekly quests, find progress for current period
  let query = { userId, questId };
  
  if (quest.cadence !== 'one-time' && periodStart && periodEnd) {
    query.periodStart = periodStart;
    query.periodEnd = periodEnd;
  }
  
  let progress = await this.findOne(query);
  
  if (!progress) {
    progress = await this.create({
      userId,
      questId,
      periodStart: quest.cadence !== 'one-time' ? periodStart : null,
      periodEnd: quest.cadence !== 'one-time' ? periodEnd : null
    });
  }
  
  return progress;
};

// Static method to get user's active quests with progress
questProgressSchema.statics.getUserQuestsWithProgress = async function(userId, cadence = null) {
  const Quest = mongoose.model('Quest');
  const activeQuests = await Quest.getActiveQuests(cadence);
  
  const now = new Date();
  let periodStart, periodEnd;
  
  if (cadence === 'daily') {
    periodStart = new Date(now.setHours(0, 0, 0, 0));
    periodEnd = new Date(now.setHours(23, 59, 59, 999));
  } else if (cadence === 'weekly') {
    const dayOfWeek = now.getDay();
    periodStart = new Date(now.setDate(now.getDate() - dayOfWeek));
    periodStart.setHours(0, 0, 0, 0);
    periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 6);
    periodEnd.setHours(23, 59, 59, 999);
  }
  
  const questsWithProgress = await Promise.all(
    activeQuests.map(async (quest) => {
      const progress = await this.getOrCreate(userId, quest._id, periodStart, periodEnd);
      
      return {
        quest: quest.toObject(),
        progress: progress.toObject()
      };
    })
  );
  
  return questsWithProgress;
};

// Instance method to update progress
questProgressSchema.methods.updateProgress = async function(incrementBy = 1, eventId = null) {
  const Quest = mongoose.model('Quest');
  const quest = await Quest.findById(this.questId);
  
  if (!quest) {
    throw new Error('Quest not found');
  }
  
  // Don't update if already completed and claimed
  if (this.isClaimed) {
    return this;
  }
  
  this.progressValue += incrementBy;
  if (eventId) {
    this.lastEventId = eventId;
  }
  
  // Check if quest is completed
  let targetValue = 1; // Default for action_once
  
  if (quest.rules.type === 'event_count') {
    targetValue = quest.rules.targetCount || 1;
  } else if (quest.rules.type === 'xp_threshold') {
    const User = mongoose.model('User');
    const user = await User.findById(this.userId);
    targetValue = quest.rules.targetXP;
    this.progressValue = user.totalXP; // Use actual XP as progress
  }
  
  if (this.progressValue >= targetValue && !this.isCompleted) {
    this.isCompleted = true;
    this.completedAt = new Date();
  }
  
  await this.save();
  return this;
};

// Instance method to claim reward
questProgressSchema.methods.claimReward = async function() {
  if (!this.isCompleted) {
    throw new Error('Quest not completed yet');
  }
  
  if (this.isClaimed) {
    throw new Error('Reward already claimed');
  }
  
  const Quest = mongoose.model('Quest');
  const XPLedger = mongoose.model('XPLedger');
  
  const quest = await Quest.findById(this.questId);
  if (!quest) {
    throw new Error('Quest not found');
  }
  
  // Add XP reward
  await XPLedger.addXP(
    this.userId,
    quest.rewardXP,
    'complete_quest',
    `Completed quest: ${quest.name}`,
    { questId: this.questId }
  );
  
  this.isClaimed = true;
  this.claimedAt = new Date();
  await this.save();
  
  return this;
};

// Static method to reset daily quests
questProgressSchema.statics.resetDailyQuests = async function() {
  // This will be called by cron job
  // We don't actually delete old progress, just let new period create new records
  console.log('Daily quest reset triggered');
  return { success: true, message: 'Daily quests reset' };
};

const QuestProgress = mongoose.model('QuestProgress', questProgressSchema);

module.exports = QuestProgress;
