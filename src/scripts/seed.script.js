require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const xpService = require('../services/xp.service');
const questService = require('../services/quest.service');
const logger = require('../utils/logger');

async function seedData() {
  try {
    logger.info('Starting data seeding...');
    
    // Connect to database
    await connectDB();
    
    // Seed XP rules
    logger.info('Seeding XP rules...');
    await xpService.seedDefaultRules();
    
    // Seed quests
    logger.info('Seeding quests...');
    await questService.seedDefaultQuests();
    
    logger.info('Data seeding completed successfully!');
    
    process.exit(0);
  } catch (error) {
    logger.error('Data seeding failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Run seeding
seedData();
