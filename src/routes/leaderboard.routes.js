const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboard.controller');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// Public routes
router.get('/', leaderboardController.getLeaderboard);
router.get('/snapshot/latest', leaderboardController.getLatestSnapshot);

// Protected routes
router.get('/me', protect, leaderboardController.getMyRank);

// Admin routes
router.post('/admin/generate', protect, adminOnly, leaderboardController.generateSnapshot);

module.exports = router;
