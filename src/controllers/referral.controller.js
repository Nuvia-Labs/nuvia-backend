const referralService = require('../services/referral.service');
const logger = require('../utils/logger');

// @desc    Get my referral code and stats
// @route   GET /api/referral/me
// @access  Private
exports.getMyReferral = async (req, res) => {
  try {
    const userId = req.user.userId;
    const data = await referralService.getUserReferralStats(userId);
    
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Get my referral error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get referral information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Track referral (when user signs up with a referral code)
// @route   POST /api/referral/track
// @access  Private
exports.trackReferral = async (req, res) => {
  try {
    const { referralCode } = req.body;
    const userId = req.user.userId;
    
    if (!referralCode) {
      return res.status(400).json({
        success: false,
        message: 'Referral code is required'
      });
    }
    
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      source: req.body.source || 'web'
    };
    
    const result = await referralService.trackReferral(referralCode, userId, metadata);
    
    const statusCode = result.success ? 200 : 400;
    
    res.status(statusCode).json(result);
  } catch (error) {
    logger.error('Track referral error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to track referral',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get my referral history
// @route   GET /api/referral/history
// @access  Private
exports.getMyReferralHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, limit = 50, skip = 0 } = req.query;
    
    const referrals = await referralService.getUserReferrals(userId, {
      status,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
    
    res.status(200).json({
      success: true,
      data: referrals
    });
  } catch (error) {
    logger.error('Get my referral history error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get referral history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify referral code
// @route   GET /api/referral/verify/:code
// @access  Public
exports.verifyReferralCode = async (req, res) => {
  try {
    const { code } = req.params;
    
    const result = await referralService.verifyReferralCode(code);
    
    const statusCode = result.valid ? 200 : 404;
    
    res.status(statusCode).json({
      success: result.valid,
      data: result.valid ? {
        valid: result.valid,
        referralCode: result.referralCode,
        referralCount: result.referralCount
      } : null,
      message: result.message
    });
  } catch (error) {
    logger.error('Verify referral code error', {
      error: error.message,
      code: req.params.code,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to verify referral code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Admin override referral
// @route   POST /api/admin/referral/override
// @access  Private (Admin only)
exports.adminOverrideReferral = async (req, res) => {
  try {
    const { referralId, action, reason } = req.body;
    
    if (!referralId || !action) {
      return res.status(400).json({
        success: false,
        message: 'Referral ID and action are required'
      });
    }
    
    const result = await referralService.adminOverrideReferral(referralId, action, reason);
    
    res.status(200).json(result);
  } catch (error) {
    logger.error('Admin override referral error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to override referral',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
