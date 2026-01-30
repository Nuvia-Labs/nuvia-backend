const Quest = require('../models/Quest');
const QuestProgress = require('../models/QuestProgress');
const logger = require('../utils/logger');

class QuestService {
  // Get today's quests with user progress
  async getTodayQuests(userId) {
    try {
      const questsWithProgress = await QuestProgress.getUserQuestsWithProgress(userId, 'daily');
      
      return questsWithProgress;
    } catch (error) {
      logger.error('Get today quests error', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
  
  // Get all active quests with user progress
  async getAllActiveQuests(userId) {
    try {
      const questsWithProgress = await QuestProgress.getUserQuestsWithProgress(userId);
      
      return questsWithProgress;
    } catch (error) {
      logger.error('Get all active quests error', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
  
  // Claim quest reward
  async claimQuestReward(userId, questId) {
    try {
      const quest = await Quest.findById(questId);
      
      if (!quest) {
        return {
          success: false,
          message: 'Quest not found'
        };
      }
      
      if (!quest.isCurrentlyActive()) {
        return {
          success: false,
          message: 'Quest is not currently active'
        };
      }
      
      // Get current period
      const now = new Date();
      let periodStart, periodEnd;
      
      if (quest.cadence === 'daily') {
        periodStart = new Date(now.setHours(0, 0, 0, 0));
        periodEnd = new Date(now.setHours(23, 59, 59, 999));
      } else if (quest.cadence === 'weekly') {
        const dayOfWeek = now.getDay();
        periodStart = new Date(now.setDate(now.getDate() - dayOfWeek));
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 6);
        periodEnd.setHours(23, 59, 59, 999);
      }
      
      const progress = await QuestProgress.getOrCreate(userId, questId, periodStart, periodEnd);
      
      if (!progress.isCompleted) {
        return {
          success: false,
          message: 'Quest not completed yet',
          progress: progress.progressValue
        };
      }
      
      if (progress.isClaimed) {
        return {
          success: false,
          message: 'Reward already claimed'
        };
      }
      
      await progress.claimReward();
      
      logger.info('Quest reward claimed', {
        userId,
        questId,
        xpAwarded: quest.rewardXP
      });
      
      return {
        success: true,
        message: 'Quest reward claimed successfully',
        xpAwarded: quest.rewardXP
      };
    } catch (error) {
      logger.error('Claim quest reward error', {
        error: error.message,
        userId,
        questId
      });
      throw error;
    }
  }
  
  // Get quest history for user
  async getQuestHistory(userId, options = {}) {
    try {
      const { limit = 50, skip = 0 } = options;
      
      const history = await QuestProgress.find({ userId, isClaimed: true })
        .populate('questId')
        .sort({ claimedAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));
      
      return history;
    } catch (error) {
      logger.error('Get quest history error', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
  
  // Seed default quests
  async seedDefaultQuests() {
    try {
      const defaultQuests = [
        {
          name: 'Daily Login',
          description: 'Connect your wallet once per day',
          cadence: 'daily',
          rules: {
            type: 'event_count',
            eventType: 'connect_wallet',
            targetCount: 1
          },
          rewardXP: 25,
          metadata: {
            icon: '🔐',
            category: 'daily',
            difficulty: 'easy',
            displayOrder: 1
          }
        },
        {
          name: 'Claim Faucet',
          description: 'Claim testnet tokens from faucet',
          cadence: 'daily',
          rules: {
            type: 'event_count',
            eventType: 'claim_faucet',
            targetCount: 1
          },
          rewardXP: 50,
          metadata: {
            icon: '💧',
            category: 'daily',
            difficulty: 'easy',
            displayOrder: 2
          }
        },
        {
          name: 'Make a Deposit',
          description: 'Deposit funds into any protocol',
          cadence: 'daily',
          rules: {
            type: 'event_count',
            eventType: 'deposit',
            targetCount: 1
          },
          rewardXP: 100,
          metadata: {
            icon: '💰',
            category: 'daily',
            difficulty: 'medium',
            displayOrder: 3
          }
        },
        {
          name: 'Supply Assets',
          description: 'Supply assets to a lending protocol',
          cadence: 'daily',
          rules: {
            type: 'event_count',
            eventType: 'supply',
            targetCount: 1
          },
          rewardXP: 150,
          metadata: {
            icon: '🏦',
            category: 'daily',
            difficulty: 'medium',
            displayOrder: 4
          }
        },
        {
          name: 'Strategy Explorer',
          description: 'Select an investment strategy',
          cadence: 'daily',
          rules: {
            type: 'event_count',
            eventType: 'select_strategy',
            targetCount: 1
          },
          rewardXP: 30,
          metadata: {
            icon: '📊',
            category: 'daily',
            difficulty: 'easy',
            displayOrder: 5
          }
        }
      ];
      
      for (const questData of defaultQuests) {
        const existing = await Quest.findOne({ name: questData.name });
        if (!existing) {
          await Quest.create(questData);
          logger.info('Default quest created', { name: questData.name });
        }
      }
      
      return { success: true, message: 'Default quests seeded' };
    } catch (error) {
      logger.error('Seed default quests error', { error: error.message });
      throw error;
    }
  }
  
  // Admin: Create quest
  async createQuest(questData) {
    try {
      const quest = await Quest.create(questData);
      
      logger.info('Quest created by admin', {
        questId: quest._id,
        name: quest.name
      });
      
      return quest;
    } catch (error) {
      logger.error('Create quest error', { error: error.message });
      throw error;
    }
  }
  
  // Admin: Update quest
  async updateQuest(questId, updateData) {
    try {
      const quest = await Quest.findByIdAndUpdate(questId, updateData, { new: true });
      
      if (!quest) {
        throw new Error('Quest not found');
      }
      
      logger.info('Quest updated by admin', {
        questId: quest._id,
        name: quest.name
      });
      
      return quest;
    } catch (error) {
      logger.error('Update quest error', { error: error.message, questId });
      throw error;
    }
  }
}

module.exports = new QuestService();
