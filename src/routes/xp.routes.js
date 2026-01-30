const express = require('express');
const router = express.Router();
const xpController = require('../controllers/xp.controller');
const { protect } = require('../middlewares/authMiddleware');

// Event routes
router.post('/events', protect, xpController.submitEvent);
router.get('/events/me', protect, xpController.getMyEvents);

// XP routes
router.get('/xp/me', protect, xpController.getMyXP);
router.get('/xp/ledger', protect, xpController.getMyLedger);
router.get('/xp/rules', xpController.getRules);

module.exports = router;
