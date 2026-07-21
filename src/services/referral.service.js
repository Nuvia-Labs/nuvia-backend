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
  
  // Apply referral code — increment referrer's count and create referral record
  async applyReferral(referralCode, inviteeUserId, metadata = {}) {
    try {
      const upperCode = referralCode.toUpperCase();

      // Find referrer by referral code in User collection
      const referrer = await User.findOne({ referralCode: upperCode });

      if (!referrer) {
        return {
          success: false,
          message: 'Invalid referral code'
        };
      }

      // Prevent self-referral
      if (referrer._id.toString() === inviteeUserId.toString()) {
        return {
          success: false,
          message: 'Cannot use your own referral code'
        };
      }

      // Check if invitee already has a referral record
      const existingReferral = await Referral.findOne({ inviteeUserId });
      if (existingReferral) {
        return {
          success: false,
          code: 'ALREADY_APPLIED',
          message: 'Referral code already applied'
        };
      }

      // Create referral record
      const referral = await Referral.createReferral(
        referrer._id,
        inviteeUserId,
        upperCode,
        metadata
      );

      // Increment referrer's waitlist referral count
      const Waitlist = require('../models/Waitlist');
      await Waitlist.incrementReferralCount(upperCode);

      logger.info('Referral applied', {
        referralId: referral._id,
        inviterId: referrer._id,
        inviteeId: inviteeUserId,
        referralCode: upperCode
      });

      return {
        success: true,
        data: {
          referralId: referral._id,
          referrerCode: upperCode,
          status: referral.status
        },
        message: 'Referral code applied successfully'
      };
    } catch (error) {
      if (error.message.includes('already been referred')) {
        return {
          success: false,
          code: 'ALREADY_APPLIED',
          message: error.message
        };
      }

      logger.error('Apply referral error', {
        error: error.message,
        referralCode,
        inviteeUserId
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
