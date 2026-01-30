const LeaderboardSnapshot = require('../models/LeaderboardSnapshot');
const LeaderboardRow = require('../models/LeaderboardRow');
const User = require('../models/User');
const XPLedger = require('../models/XPLedger');
const logger = require('../utils/logger');

class LeaderboardService {
  // Generate leaderboard snapshot
  async generateSnapshot(period = 'all-time') {
    try {
      logger.info('Starting leaderboard snapshot generation', { period });
      
      // Create snapshot record
      const snapshot = await LeaderboardSnapshot.createSnapshot(period);
      
      try {
        // Calculate date range
        const now = new Date();
        let startAt = snapshot.startAt;
        let endAt = snapshot.endAt;
        
        // Build aggregation pipeline based on period
        let matchStage = {};
        
        if (period === 'daily' || period === 'weekly') {
          matchStage = {
            createdAt: {
              $gte: startAt,
              $lte: endAt
            }
          };
        }
        
        // Aggregate XP by user for the period
        const userScores = await XPLedger.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: '$userId',
              totalXP: { $sum: '$deltaXP' }
            }
          },
          { $match: { totalXP: { $gt: 0 } } }, // Only users with positive XP
          { $sort: { totalXP: -1, _id: 1 } } // Sort by XP desc, then by userId for tie-breaker
        ]);
        
        logger.info('User scores calculated', {
          period,
          userCount: userScores.length
        });
        
        // Populate user data and create rows
        const rows = [];
        
        for (let i = 0; i < userScores.length; i++) {
          const userScore = userScores[i];
          const user = await User.findById(userScore._id);
          
          if (user && user.isActive) {
            rows.push({
              userId: user._id,
              score: userScore.totalXP,
              metadata: {
                walletAddress: user.walletAddress,
                referralCount: 0, // Can be populated if needed
                questsCompleted: 0 // Can be populated if needed
              }
            });
          }
        }
        
        // Bulk insert rows
        if (rows.length > 0) {
          await LeaderboardRow.bulkInsertRows(snapshot._id, rows);
        }
        
        // Calculate metadata
        const topScore = rows.length > 0 ? rows[0].score : 0;
        const averageScore = rows.length > 0
          ? rows.reduce((sum, row) => sum + row.score, 0) / rows.length
          : 0;
        
        // Mark snapshot as completed
        await snapshot.markCompleted(rows.length, {
          topScore,
          averageScore
        });
        
        logger.info('Leaderboard snapshot generated successfully', {
          snapshotId: snapshot._id,
          period,
          totalUsers: rows.length,
          topScore,
          averageScore
        });
        
        return snapshot;
      } catch (error) {
        await snapshot.markFailed();
        throw error;
      }
    } catch (error) {
      logger.error('Generate snapshot error', {
        error: error.message,
        stack: error.stack,
        period
      });
      throw error;
    }
  }
  
  // Get leaderboard
  async getLeaderboard(period = 'all-time', options = {}) {
    try {
      const { limit = 100, skip = 0 } = options;
      
      // Get latest snapshot for the period
      const snapshot = await LeaderboardSnapshot.getLatest(period);
      
      if (!snapshot) {
        // Generate snapshot if not exists
        await this.generateSnapshot(period);
        return this.getLeaderboard(period, options);
      }
      
      // Get leaderboard rows
      const rows = await LeaderboardRow.getLeaderboard(snapshot._id, {
        limit: parseInt(limit),
        skip: parseInt(skip)
      });
      
      return {
        snapshot: {
          period: snapshot.period,
          generatedAt: snapshot.generatedAt,
          totalUsers: snapshot.totalUsers
        },
        leaderboard: rows
      };
    } catch (error) {
      logger.error('Get leaderboard error', {
        error: error.message,
        period
      });
      throw error;
    }
  }
  
  // Get user rank
  async getUserRank(userId, period = 'all-time') {
    try {
      // Get latest snapshot for the period
      const snapshot = await LeaderboardSnapshot.getLatest(period);
      
      if (!snapshot) {
        return {
          found: false,
          message: 'Leaderboard not yet generated'
        };
      }
      
      // Get user rank
      const userRow = await LeaderboardRow.getUserRank(snapshot._id, userId);
      
      if (!userRow) {
        return {
          found: false,
          message: 'User not found in leaderboard'
        };
      }
      
      return {
        found: true,
        rank: userRow.rank,
        score: userRow.score,
        totalUsers: snapshot.totalUsers,
        period: snapshot.period,
        generatedAt: snapshot.generatedAt
      };
    } catch (error) {
      logger.error('Get user rank error', {
        error: error.message,
        userId,
        period
      });
      throw error;
    }
  }
  
  // Get latest snapshot metadata
  async getLatestSnapshot(period = 'all-time') {
    try {
      const snapshot = await LeaderboardSnapshot.getLatest(period);
      
      if (!snapshot) {
        return {
          exists: false,
          message: 'No snapshot available'
        };
      }
      
      return {
        exists: true,
        snapshot: {
          period: snapshot.period,
          generatedAt: snapshot.generatedAt,
          totalUsers: snapshot.totalUsers,
          topScore: snapshot.metadata?.topScore,
          averageScore: snapshot.metadata?.averageScore
        }
      };
    } catch (error) {
      logger.error('Get latest snapshot error', {
        error: error.message,
        period
      });
      throw error;
    }
  }
}

module.exports = new LeaderboardService();
