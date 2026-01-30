const xpService = require('../services/xp.service');
const logger = require('../utils/logger');

// @desc    Submit event
// @route   POST /api/events
// @access  Private
exports.submitEvent = async (req, res) => {
  try {
    const { type, metadata, idempotencyKey } = req.body;
    const userId = req.user.userId;
    
    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Event type is required'
      });
    }
    
    // Use idempotency key if provided, otherwise generate from metadata
    let dedupKey = idempotencyKey;
    
    if (!dedupKey && metadata?.txHash) {
      dedupKey = `${userId}_${type}_${metadata.txHash}`;
    }
    
    const result = await xpService.processEvent(userId, type, metadata || {}, dedupKey);
    
    const statusCode = result.success ? 200 : 400;
    
    res.status(statusCode).json({
      success: result.success,
      message: result.message,
      data: {
        eventId: result.event?._id,
        xpAwarded: result.xpAwarded,
        nextAvailableAt: result.nextAvailableAt
      }
    });
  } catch (error) {
    logger.error('Submit event error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to submit event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user XP summary
// @route   GET /api/xp/me
// @access  Private
exports.getMyXP = async (req, res) => {
  try {
    const userId = req.user.userId;
    const summary = await xpService.getUserXPSummary(userId);
    
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Get my XP error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get XP summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get active XP rules
// @route   GET /api/xp/rules
// @access  Public
exports.getRules = async (req, res) => {
  try {
    const rules = await xpService.getActiveRules();
    
    res.status(200).json({
      success: true,
      data: rules
    });
  } catch (error) {
    logger.error('Get rules error', {
      error: error.message,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get XP rules',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user XP ledger
// @route   GET /api/xp/ledger
// @access  Private
exports.getMyLedger = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, skip = 0, reason, startDate, endDate } = req.query;
    
    const XPLedger = require('../models/XPLedger');
    
    const ledger = await XPLedger.getUserLedger(userId, {
      reason,
      limit: parseInt(limit),
      skip: parseInt(skip),
      startDate,
      endDate
    });
    
    res.status(200).json({
      success: true,
      data: ledger
    });
  } catch (error) {
    logger.error('Get my ledger error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get XP ledger',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user events
// @route   GET /api/events/me
// @access  Private
exports.getMyEvents = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, status, limit = 50, skip = 0, startDate, endDate } = req.query;
    
    const Event = require('../models/Event');
    
    const events = await Event.getUserEvents(userId, {
      type,
      status,
      limit: parseInt(limit),
      skip: parseInt(skip),
      startDate,
      endDate
    });
    
    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    logger.error('Get my events error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get events',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
