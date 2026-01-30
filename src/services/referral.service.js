const Referral = require('../models/Referral');
const User = require('../models/User');
const logger = require('../utils/logger');

class ReferralService {
  // Track referral intent
  async trackReferral(inviterReferralCode, inviteeUserId, metadata = {}) {
    try {
      // Find inviter by referral code
      const inviter = await User.findOne({ referralCode: inviterReferralCode.toUpperCase() });
      
      if (!inviter) {
        return {
          success: false,
          message: 'Invalid referral code'
        };
      }
      
      // Check if invitee is trying to refer themselves
      if (inviter._id.toString() === inviteeUserId.toString()) {
        return {
          success: false,
          message: 'Cannot refer yourself'
        };
      }
      
      // Create referral
      const referral = await Referral.createReferral(
        inviter._id,
        inviteeUserId,
        inviterReferralCode.toUpperCase(),
        metadata
      );
      
      logger.info('Referral tracked', {
        referralId: referral._id,
        inviterId: inviter._id,
        inviteeId: inviteeUserId,
        referralCode: inviterReferralCode
      });
      
      return {
        success: true,
        referral,
        message: 'Referral tracked successfully'
      };
    } catch (error) {
      if (error.message.includes('already been referred')) {
        return {
          success: false,
          message: error.message
        };
      }
      
      logger.error('Track referral error', {
        error: error.message,
        inviterReferralCode,
        inviteeUserId
      });
      
      throw error;
    }
  }
  
  // Check and verify pending referrals for a user
  async checkAndVerifyReferrals(userId) {
    try {
      // Find pending referrals where this user is the invitee
      const pendingReferrals = await Referral.find({
        inviteeUserId: userId,
        status: 'pending'
      });
      
      const results = [];
      
      for (const referral of pendingReferrals) {
        const verificationResult = await referral.checkVerification();
        
        if (verificationResult.verified) {
          // Distribute rewards
          const inviterXP = parseInt(process.env.DEFAULT_REFERRAL_INVITER_XP) || 500;
          const inviteeXP = parseInt(process.env.DEFAULT_REFERRAL_INVITEE_XP) || 100;
          
          await referral.distributeRewards(inviterXP, inviteeXP);
          
          logger.info('Referral verified and rewarded', {
            referralId: referral._id,
            inviterXP,
            inviteeXP
          });
          
          results.push({
            referralId: referral._id,
            status: 'rewarded',
            inviterXP,
            inviteeXP
          });
        } else {
          results.push({
            referralId: referral._id,
            status: 'pending',
            criteria: verificationResult.criteria
          });
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Check and verify referrals error', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
  
  // Get user referral stats
  async getUserReferralStats(userId) {
    try {
      const stats = await Referral.getReferralStats(userId);
      const user = await User.findById(userId);
      
      return {
        referralCode: user.referralCode,
        stats
      };
    } catch (error) {
      logger.error('Get user referral stats error', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
  
  // Get user referrals with details
  async getUserReferrals(userId, options = {}) {
    try {
      return await Referral.getUserReferrals(userId, options);
    } catch (error) {
      logger.error('Get user referrals error', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
  
  // Verify referral code exists
  async verifyReferralCode(referralCode) {
    try {
      const user = await User.findOne({ referralCode: referralCode.toUpperCase() });
      
      if (!user) {
        return {
          valid: false,
          message: 'Invalid referral code'
        };
      }
      
      const stats = await Referral.getReferralStats(user._id);
      
      return {
        valid: true,
        referralCode: user.referralCode,
        referralCount: stats.rewarded || 0
      };
    } catch (error) {
      logger.error('Verify referral code error', {
        error: error.message,
        referralCode
      });
      throw error;
    }
  }
  
  // Admin: Override referral status
  async adminOverrideReferral(referralId, action, reason = '') {
    try {
      const referral = await Referral.findById(referralId);
      
      if (!referral) {
        throw new Error('Referral not found');
      }
      
      if (action === 'approve') {
        // Force verification
        referral.status = 'verified';
        referral.verifiedAt = new Date();
        await referral.save();
        
        // Distribute rewards
        const inviterXP = parseInt(process.env.DEFAULT_REFERRAL_INVITER_XP) || 500;
        const inviteeXP = parseInt(process.env.DEFAULT_REFERRAL_INVITEE_XP) || 100;
        
        await referral.distributeRewards(inviterXP, inviteeXP);
        
        logger.info('Referral approved by admin', {
          referralId,
          reason
        });
        
        return {
          success: true,
          referral,
          message: 'Referral approved and rewarded'
        };
      } else if (action === 'reject') {
        await referral.reject(reason);
        
        logger.info('Referral rejected by admin', {
          referralId,
          reason
        });
        
        return {
          success: true,
          referral,
          message: 'Referral rejected'
        };
      } else {
        throw new Error('Invalid action. Use "approve" or "reject"');
      }
    } catch (error) {
      logger.error('Admin override referral error', {
        error: error.message,
        referralId,
        action
      });
      throw error;
    }
  }
}

module.exports = new ReferralService();
