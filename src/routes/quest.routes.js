const express = require('express');
const router = express.Router();
const questController = require('../controllers/quest.controller');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// Protected routes
router.get('/today', protect, questController.getTodayQuests);
router.get('/', protect, questController.getAllQuests);
router.post('/claim', protect, questController.claimQuestReward);
router.get('/history', protect, questController.getQuestHistory);

// Admin routes
router.post('/admin', protect, adminOnly, questController.createQuest);
router.put('/admin/:id', protect, adminOnly, questController.updateQuest);

module.exports = router;
