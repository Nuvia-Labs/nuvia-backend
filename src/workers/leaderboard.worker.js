const cron = require('node-cron');
const leaderboardService = require('../services/leaderboard.service');
const logger = require('../utils/logger');

class LeaderboardWorker {
  constructor() {
    this.jobs = [];
  }
  
  // Start all cron jobs
  start() {
    logger.info('Starting leaderboard worker');
    
    // Generate all-time leaderboard every hour
    const allTimeJob = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running all-time leaderboard generation');
        await leaderboardService.generateSnapshot('all-time');
        logger.info('All-time leaderboard generated successfully');
      } catch (error) {
        logger.error('All-time leaderboard generation failed', {
          error: error.message,
          stack: error.stack
        });
      }
    });
    
    this.jobs.push({ name: 'all-time-leaderboard', job: allTimeJob });
    
    // Generate daily leaderboard every 30 minutes
    const dailyJob = cron.schedule('*/30 * * * *', async () => {
      try {
        logger.info('Running daily leaderboard generation');
        await leaderboardService.generateSnapshot('daily');
        logger.info('Daily leaderboard generated successfully');
      } catch (error) {
        logger.error('Daily leaderboard generation failed', {
          error: error.message,
          stack: error.stack
        });
      }
    });
    
    this.jobs.push({ name: 'daily-leaderboard', job: dailyJob });
    
    // Generate weekly leaderboard every hour
    const weeklyJob = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running weekly leaderboard generation');
        await leaderboardService.generateSnapshot('weekly');
        logger.info('Weekly leaderboard generated successfully');
      } catch (error) {
        logger.error('Weekly leaderboard generation failed', {
          error: error.message,
          stack: error.stack
        });
      }
    });
    
    this.jobs.push({ name: 'weekly-leaderboard', job: weeklyJob });
    
    logger.info('Leaderboard worker started', {
      jobs: this.jobs.map(j => j.name)
    });
    
    // Generate initial snapshots
    this.generateInitialSnapshots();
  }
  
  // Generate initial snapshots on startup
  async generateInitialSnapshots() {
    try {
      logger.info('Generating initial leaderboard snapshots');
      
      await leaderboardService.generateSnapshot('all-time');
      await leaderboardService.generateSnapshot('daily');
      await leaderboardService.generateSnapshot('weekly');
      
      logger.info('Initial leaderboard snapshots generated');
    } catch (error) {
      logger.error('Failed to generate initial snapshots', {
        error: error.message,
        stack: error.stack
      });
    }
  }
  
  // Stop all cron jobs
  stop() {
    logger.info('Stopping leaderboard worker');
    
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      logger.info('Stopped job', { name });
    });
    
    this.jobs = [];
  }
  
  // Get worker status
  getStatus() {
    return {
      running: this.jobs.length > 0,
      jobs: this.jobs.map(({ name }) => name)
    };
  }
}

module.exports = new LeaderboardWorker();
