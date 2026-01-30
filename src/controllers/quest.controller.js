const questService = require('../services/quest.service');
const logger = require('../utils/logger');

// @desc    Get today's quests
// @route   GET /api/quests/today
// @access  Private
exports.getTodayQuests = async (req, res) => {
  try {
    const userId = req.user.userId;
    const quests = await questService.getTodayQuests(userId);
    
    res.status(200).json({
      success: true,
      data: quests
    });
  } catch (error) {
    logger.error('Get today quests error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get today\'s quests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all active quests
// @route   GET /api/quests
// @access  Private
exports.getAllQuests = async (req, res) => {
  try {
    const userId = req.user.userId;
    const quests = await questService.getAllActiveQuests(userId);
    
    res.status(200).json({
      success: true,
      data: quests
    });
  } catch (error) {
    logger.error('Get all quests error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get quests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Claim quest reward
// @route   POST /api/quests/claim
// @access  Private
exports.claimQuestReward = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { questId } = req.body;
    
    if (!questId) {
      return res.status(400).json({
        success: false,
        message: 'Quest ID is required'
      });
    }
    
    const result = await questService.claimQuestReward(userId, questId);
    
    const statusCode = result.success ? 200 : 400;
    
    res.status(statusCode).json(result);
  } catch (error) {
    logger.error('Claim quest reward error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to claim quest reward',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get quest history
// @route   GET /api/quests/history
// @access  Private
exports.getQuestHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, skip = 0 } = req.query;
    
    const history = await questService.getQuestHistory(userId, {
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
    
    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Get quest history error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get quest history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Create quest (Admin)
// @route   POST /api/admin/quests
// @access  Private (Admin only)
exports.createQuest = async (req, res) => {
  try {
    const quest = await questService.createQuest(req.body);
    
    res.status(201).json({
      success: true,
      data: quest,
      message: 'Quest created successfully'
    });
  } catch (error) {
    logger.error('Create quest error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to create quest',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update quest (Admin)
// @route   PUT /api/admin/quests/:id
// @access  Private (Admin only)
exports.updateQuest = async (req, res) => {
  try {
    const { id } = req.params;
    const quest = await questService.updateQuest(id, req.body);
    
    res.status(200).json({
      success: true,
      data: quest,
      message: 'Quest updated successfully'
    });
  } catch (error) {
    logger.error('Update quest error', {
      error: error.message,
      userId: req.user?.userId,
      questId: req.params.id,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to update quest',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
