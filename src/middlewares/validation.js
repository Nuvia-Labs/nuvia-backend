const { body, param, validationResult } = require('express-validator');

/**
 * Validation rules for joining waitlist
 */
exports.joinWaitlistValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('walletAddress')
    .trim()
    .notEmpty()
    .withMessage('Wallet address is required')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Please provide a valid Ethereum wallet address'),
  
  body('referredBy')
    .optional()
    .trim()
    .isLength({ min: 8, max: 8 })
    .withMessage('Referral code must be 8 characters')
    .isAlphanumeric()
    .withMessage('Referral code must contain only letters and numbers'),
  
  body('source')
    .optional()
    .trim()
    .isIn(['web', 'mobile', 'twitter', 'discord', 'telegram'])
    .withMessage('Invalid source value')
];

/**
 * Validation rules for getting position
 */
exports.getPositionValidation = [
  param('identifier')
    .trim()
    .notEmpty()
    .withMessage('Identifier (email or wallet address) is required')
];

/**
 * Validation rules for verifying referral code
 */
exports.verifyReferralValidation = [
  param('referralCode')
    .trim()
    .notEmpty()
    .withMessage('Referral code is required')
    .isLength({ min: 8, max: 8 })
    .withMessage('Referral code must be 8 characters')
    .isAlphanumeric()
    .withMessage('Referral code must contain only letters and numbers')
];

/**
 * Middleware to handle validation errors
 */
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};
