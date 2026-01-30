const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referral.controller');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// Public routes
router.get('/verify/:code', referralController.verifyReferralCode);

// Protected routes
router.get('/me', protect, referralController.getMyReferral);
router.post('/track', protect, referralController.trackReferral);
router.get('/history', protect, referralController.getMyReferralHistory);

// Admin routes
router.post('/admin/override', protect, adminOnly, referralController.adminOverrideReferral);

module.exports = router;
