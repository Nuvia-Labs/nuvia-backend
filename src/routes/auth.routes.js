const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/authMiddleware');

// Public routes
router.post('/nonce', authController.requestNonce);
router.post('/verify', authController.verifySignature);

// Protected routes
router.get('/me', protect, authController.getMe);

module.exports = router;
