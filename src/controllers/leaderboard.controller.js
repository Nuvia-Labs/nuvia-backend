const leaderboardService = require('../services/leaderboard.service');
const logger = require('../utils/logger');

// @desc    Get leaderboard
// @route   GET /api/leaderboard
// @access  Public
exports.getLeaderboard = async (req, res) => {
  try {
    const { period = 'all-time', limit = 100, skip = 0 } = req.query;
    
    // Validate period
    const validPeriods = ['all-time', 'daily', 'weekly'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid period. Must be one of: all-time, daily, weekly'
      });
    }
    
    const data = await leaderboardService.getLeaderboard(period, {
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
    
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Get leaderboard error', {
      error: error.message,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get leaderboard',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get my rank
// @route   GET /api/leaderboard/me
// @access  Private
exports.getMyRank = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { period = 'all-time' } = req.query;
    
    // Validate period
    const validPeriods = ['all-time', 'daily', 'weekly'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid period. Must be one of: all-time, daily, weekly'
      });
    }
    
    const data = await leaderboardService.getUserRank(userId, period);
    
    const statusCode = data.found ? 200 : 404;
    
    res.status(statusCode).json({
      success: data.found,
      data: data.found ? data : null,
      message: data.message
    });
  } catch (error) {
    logger.error('Get my rank error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get rank',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get latest snapshot metadata
// @route   GET /api/leaderboard/snapshot/latest
// @access  Public
exports.getLatestSnapshot = async (req, res) => {
  try {
    const { period = 'all-time' } = req.query;
    
    // Validate period
    const validPeriods = ['all-time', 'daily', 'weekly'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid period. Must be one of: all-time, daily, weekly'
      });
    }
    
    const data = await leaderboardService.getLatestSnapshot(period);
    
    res.status(200).json({
      success: data.exists,
      data: data.exists ? data.snapshot : null,
      message: data.message
    });
  } catch (error) {
    logger.error('Get latest snapshot error', {
      error: error.message,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get snapshot',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Generate snapshot (Admin)
// @route   POST /api/admin/leaderboard/generate
// @access  Private (Admin only)
exports.generateSnapshot = async (req, res) => {
  try {
    const { period = 'all-time' } = req.body;
    
    // Validate period
    const validPeriods = ['all-time', 'daily', 'weekly'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid period. Must be one of: all-time, daily, weekly'
      });
    }
    
    const snapshot = await leaderboardService.generateSnapshot(period);
    
    res.status(200).json({
      success: true,
      data: snapshot,
      message: 'Snapshot generated successfully'
    });
  } catch (error) {
    logger.error('Generate snapshot error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate snapshot',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
