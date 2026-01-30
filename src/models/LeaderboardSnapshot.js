const mongoose = require('mongoose');

const leaderboardSnapshotSchema = new mongoose.Schema({
  period: {
    type: String,
    enum: ['all-time', 'daily', 'weekly'],
    required: true,
    index: true
  },
  startAt: {
    type: Date,
    required: true
  },
  endAt: {
    type: Date,
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed'],
    default: 'generating',
    index: true
  },
  totalUsers: {
    type: Number,
    default: 0
  },
  metadata: {
    topScore: Number,
    averageScore: Number,
    extra: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound indexes
leaderboardSnapshotSchema.index({ period: 1, generatedAt: -1 });
leaderboardSnapshotSchema.index({ period: 1, status: 1 });

// Static method to get latest snapshot
leaderboardSnapshotSchema.statics.getLatest = async function(period) {
  return this.findOne({ period, status: 'completed' })
    .sort({ generatedAt: -1 });
};

// Static method to create new snapshot
leaderboardSnapshotSchema.statics.createSnapshot = async function(period) {
  const now = new Date();
  let startAt, endAt;
  
  if (period === 'all-time') {
    startAt = new Date(0); // Beginning of time
    endAt = now;
  } else if (period === 'daily') {
    startAt = new Date(now);
    startAt.setHours(0, 0, 0, 0);
    endAt = new Date(now);
    endAt.setHours(23, 59, 59, 999);
  } else if (period === 'weekly') {
    const dayOfWeek = now.getDay();
    startAt = new Date(now);
    startAt.setDate(now.getDate() - dayOfWeek);
    startAt.setHours(0, 0, 0, 0);
    endAt = new Date(startAt);
    endAt.setDate(endAt.getDate() + 6);
    endAt.setHours(23, 59, 59, 999);
  }
  
  const snapshot = await this.create({
    period,
    startAt,
    endAt,
    status: 'generating'
  });
  
  return snapshot;
};

// Instance method to mark as completed
leaderboardSnapshotSchema.methods.markCompleted = async function(totalUsers, metadata = {}) {
  this.status = 'completed';
  this.totalUsers = totalUsers;
  this.metadata = { ...this.metadata, ...metadata };
  await this.save();
  return this;
};

// Instance method to mark as failed
leaderboardSnapshotSchema.methods.markFailed = async function() {
  this.status = 'failed';
  await this.save();
  return this;
};

const LeaderboardSnapshot = mongoose.model('LeaderboardSnapshot', leaderboardSnapshotSchema);

module.exports = LeaderboardSnapshot;
