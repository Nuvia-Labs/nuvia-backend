const express = require('express');
const router = express.Router();
const waitlistController = require('../controllers/waitlist.controller');
const {
  joinWaitlistValidation,
  getPositionValidation,
  verifyReferralValidation,
  handleValidationErrors
} = require('../middlewares/validation');

/**
 * @route   POST /api/waitlist/join
 * @desc    Join the waitlist
 * @access  Public
 */
router.post(
  '/join',
  joinWaitlistValidation,
  handleValidationErrors,
  waitlistController.joinWaitlist
);

/**
 * @route   GET /api/waitlist/position/:identifier
 * @desc    Get position in waitlist by email or wallet address
 * @access  Public
 */
router.get(
  '/position/:identifier',
  getPositionValidation,
  handleValidationErrors,
  waitlistController.getPosition
);

/**
 * @route   GET /api/waitlist/stats
 * @desc    Get waitlist statistics
 * @access  Public
 */
router.get('/stats', waitlistController.getStats);

/**
 * @route   GET /api/waitlist/verify/:referralCode
 * @desc    Verify if referral code is valid
 * @access  Public
 */
router.get(
  '/verify/:referralCode',
  verifyReferralValidation,
  handleValidationErrors,
  waitlistController.verifyReferralCode
);

module.exports = router;
