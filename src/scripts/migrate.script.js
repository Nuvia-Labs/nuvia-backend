require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Waitlist = require('../models/Waitlist');
const User = require('../models/User');
const logger = require('../utils/logger');

async function migrateWaitlistToUser() {
  try {
    logger.info('Starting waitlist to user migration...');
    
    // Connect to database
    await connectDB();
    
    // Get all waitlist entries
    const waitlistEntries = await Waitlist.find({});
    
    logger.info(`Found ${waitlistEntries.length} waitlist entries to migrate`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const entry of waitlistEntries) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ walletAddress: entry.walletAddress });
        
        if (existingUser) {
          logger.info(`User already exists, skipping`, {
            walletAddress: entry.walletAddress
          });
          skippedCount++;
          continue;
        }
        
        // Create new user from waitlist entry
        const user = await User.create({
          walletAddress: entry.walletAddress,
          email: entry.email || null,
          referralCode: entry.referralCode, // Keep existing referral code
          totalXP: 0, // Start with 0 XP
          metadata: {
            ipAddress: entry.metadata?.ipAddress,
            userAgent: entry.metadata?.userAgent,
            source: entry.metadata?.source,
            firstLoginAt: entry.createdAt // Use waitlist join date as first login
          }
        });
        
        logger.info(`Migrated user`, {
          walletAddress: user.walletAddress,
          referralCode: user.referralCode
        });
        
        migratedCount++;
      } catch (error) {
        logger.error(`Failed to migrate entry`, {
          error: error.message,
          walletAddress: entry.walletAddress
        });
        errorCount++;
      }
    }
    
    logger.info('Migration completed', {
      total: waitlistEntries.length,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount
    });
    
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Run migration
migrateWaitlistToUser();
