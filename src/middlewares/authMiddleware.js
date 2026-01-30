const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Middleware to protect routes
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. No token provided.'
      });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
      
      // Attach user info to request
      req.user = {
        userId: decoded.userId,
        walletAddress: decoded.walletAddress
      };
      
      next();
    } catch (error) {
      logger.error('Token verification failed', {
        error: error.message,
        requestId: req.requestId
      });
      
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Invalid token.'
      });
    }
  } catch (error) {
    logger.error('Auth middleware error', {
      error: error.message,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Middleware to check if user is admin
exports.adminOnly = async (req, res, next) => {
  try {
    const User = require('../models/User');
    
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.isAdmin) {
      logger.warn('Unauthorized admin access attempt', {
        userId: req.user.userId,
        walletAddress: req.user.walletAddress,
        requestId: req.requestId
      });
      
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    next();
  } catch (error) {
    logger.error('Admin middleware error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};
