const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// Store tasks and browsers in memory
const tasks = new Map();
const browsers = new Map();

// Add memory management constants
const MEMORY_CLEANUP_INTERVAL = 5; // Clean up every 5 friends processed
const MAX_RETRIES = 5;
const RETRY_DELAY = 10000; // 10 seconds

// Utility functions
const createTaskDelays = () => {
  return {
    typing: [200, 300, 400, 500, 600],
    waiting: [3000, 6000, 8000, 10000, 12000],
    betweenFriends: [300000, 420000, 600000, 900000] // 5-15 minutes
  };
};

const getRandomDelay = (delays, type) => {
  const delayArray = delays[type];
  return delayArray[Math.floor(Math.random() * delayArray.length)];
};

// Improve retry mechanism
const retryOperation = async (operation, maxRetries = MAX_RETRIES, delay = RETRY_DELAY) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

// Add page recreation helper
async function createNewPage(browser, cookies) {
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(120000); // Increase timeout to 2 minutes
  await page.setDefaultTimeout(120000);
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  await page.setCookie(...cookies);
  
  // Add error handlers
  page.on('error', err => console.error('Page error:', err));
  page.on('pageerror', err => console.error('Page error:', err));
  
  return page;
}

// Main message processing function
async function processMessages(taskId, cookies, friendIds, message) {
  const taskDelays = createTaskDelays();
  let browser = null;
  let page = null;
  let processedCount = 0;
  const logs = [];

  const addLog = (message) => {
    const log = `${new Date().toISOString()} - ${message}`;
    console.log(log);
    logs.push(log);
    if (tasks.has(taskId)) {
      tasks.get(taskId).logs = logs;
    }
  };

  try {
    // Launch browser with improved memory settings
    browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--js-flags="--max-old-space-size=8192"', // Increase to 8GB
        '--memory-pressure-off',
        '--single-process' // Reduce memory usage
      ]
    });

    browsers.set(taskId, browser);
    page = await createNewPage(browser, cookies);

    // Process each friend with improved error handling
    for (const [index, friendId] of friendIds.entries()) {
      if (!tasks.has(taskId)) {
        addLog('Task was stopped by user');
        break;
      }

      try {
        // Recreate page periodically or if it's null
        if (!page || processedCount % MEMORY_CLEANUP_INTERVAL === 0) {
          if (page) {
            await page.close().catch(console.error);
          }
          page = await createNewPage(browser, cookies);
          addLog('Created new page for better stability');
        }

        addLog(`Processing friend ${friendId} (${processedCount + 1}/${friendIds.length})...`);

        // Navigate with improved retry
        await retryOperation(async () => {
          await page.goto(`https://www.facebook.com/messages/t/${friendId}`, {
            waitUntil: 'networkidle2',
            timeout: 120000
          });
        });

        // Send message with retry
        await retryOperation(async () => {
          await sendMessage(page, message, taskDelays, addLog);
        });

        processedCount++;
        if (tasks.has(taskId)) {
          tasks.get(taskId).result = { processedCount, totalCount: friendIds.length };
        }

        // Add delay between friends
        if (index < friendIds.length - 1) {
          const betweenDelay = getRandomDelay(taskDelays, 'betweenFriends');
          addLog(`Waiting ${betweenDelay/1000/60} minutes before next friend...`);
          await new Promise(resolve => setTimeout(resolve, betweenDelay));
        }

      } catch (error) {
        addLog(`Error processing friend ${friendId}: ${error.message}`);
        // Try to recover by creating a new page
        if (page) {
          await page.close().catch(console.error);
          page = null;
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }

    if (tasks.has(taskId)) {
      tasks.get(taskId).status = 'completed';
      addLog(`Task completed. Processed ${processedCount} out of ${friendIds.length} friends.`);
    }
  } catch (error) {
    if (tasks.has(taskId)) {
      tasks.get(taskId).status = 'failed';
      addLog(`Critical error: ${error.message}`);
    }
  } finally {
    // Clean up resources
    if (page) await page.close().catch(console.error);
    if (browser) await browser.close().catch(console.error);
    browsers.delete(taskId);
  }
}

// Helper function for sending messages
async function sendMessage(page, message, taskDelays, addLog) {
  const selector = 'div[aria-label="Message"][contenteditable="true"][role="textbox"]';
  await page.waitForSelector(selector, { timeout: 30000 });
  
  // Click textbox with delay
  const clickDelay = getRandomDelay(taskDelays, 'waiting');
  addLog(`Waiting ${clickDelay/1000} seconds before clicking...`);
  await new Promise(resolve => setTimeout(resolve, clickDelay));
  
  await page.click(selector);
  
  // Type message with random delays
  addLog("Typing message...");
  for (let char of message) {
    const typingDelay = getRandomDelay(taskDelays, 'typing');
    await page.keyboard.type(char, { delay: typingDelay });
    
    // Add random pauses while typing
    if (message.indexOf(char) % 10 === 0) {
      const pauseDelay = getRandomDelay(taskDelays, 'waiting');
      await new Promise(resolve => setTimeout(resolve, pauseDelay));
      addLog(`Typing progress: ${Math.round((message.indexOf(char) / message.length) * 100)}%`);
    }
  }

  // Wait before sending
  const sendDelay = getRandomDelay(taskDelays, 'waiting');
  addLog(`Waiting ${sendDelay/1000} seconds before sending...`);
  await new Promise(resolve => setTimeout(resolve, sendDelay));

  await page.keyboard.press('Enter');
  addLog("Message sent");

  // Wait after sending
  const afterSendDelay = getRandomDelay(taskDelays, 'waiting');
  addLog(`Waiting ${afterSendDelay/1000} seconds after sending...`);
  await new Promise(resolve => setTimeout(resolve, afterSendDelay));
}

// Controller methods
const taskController = {
  // Create new task
  createTask: async (req, res) => {
    try {
      const { cookies, friendIds, message } = req.body;
      const taskId = Date.now().toString();

      tasks.set(taskId, {
        id: taskId,
        status: 'running',
        logs: [],
        timestamp: new Date().toISOString()
      });

      processMessages(taskId, cookies, friendIds, message);
      res.json({ taskId, status: 'running' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get task status
  getTaskStatus: (req, res) => {
    const task = tasks.get(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  },

  // Get all tasks
  getAllTasks: (req, res) => {
    const taskList = Array.from(tasks.values());
    res.json(taskList);
  },

  // Stop task
  stopTask: async (req, res) => {
    const taskId = req.params.taskId;
    const browser = browsers.get(taskId);
    const task = tasks.get(taskId);

    if (browser) {
      await browser.close();
      browsers.delete(taskId);
    }

    if (task) {
      task.status = 'stopped';
      task.logs.push(`${new Date().toISOString()} - Task stopped by user`);
    }

    res.json({ status: 'stopped' });
  }
};

module.exports = taskController; 