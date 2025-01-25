const Queue = require('bull');
const { processMessages } = require('./puppeteer');
const logger = require('./logger');

function createMessageQueue() {
  const messageQueue = new Queue('facebook-messages', process.env.REDIS_URL);

  messageQueue.process('send-messages', async (job) => {
    const { taskId, cookies, friendIds, message } = job.data;
    logger.info(`Processing task ${taskId}`);

    try {
      const result = await processMessages(cookies, friendIds, message, job);
      return { status: 'completed', result };
    } catch (error) {
      logger.error(`Task ${taskId} failed:`, error);
      throw error;
    }
  });

  messageQueue.on('completed', (job) => {
    logger.info(`Task ${job.id} completed successfully`);
  });

  messageQueue.on('failed', (job, error) => {
    logger.error(`Task ${job.id} failed:`, error);
  });

  return messageQueue;
}

module.exports = { createMessageQueue }; 