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

// Add page recreation helper with error handling
async function createNewPage(browser, cookies) {
  try {
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(120000);
    await page.setDefaultTimeout(120000);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set cookies with retry
    let retries = 3;
    while (retries > 0) {
      try {
        await page.setCookie(...cookies);
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    return page;
  } catch (error) {
    console.error('Error creating new page:', error);
    throw error;
  }
}

// Improved sendMessage function with better error handling
async function sendMessage(page, message, taskDelays, addLog) {
  try {
    const selector = 'div[aria-label="Message"][contenteditable="true"][role="textbox"]';
    await page.waitForSelector(selector, { 
      timeout: 60000,
      visible: true
    });
    
    const clickDelay = getRandomDelay(taskDelays, 'waiting');
    addLog(`Waiting ${clickDelay/1000} seconds before clicking...`);
    await new Promise(resolve => setTimeout(resolve, clickDelay));
    
    await page.click(selector);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    addLog("Typing message...");
    for (let char of message) {
      if (!page.isClosed()) {
        const typingDelay = getRandomDelay(taskDelays, 'typing');
        await page.keyboard.type(char, { delay: typingDelay });
      } else {
        throw new Error('Page was closed during typing');
      }
    }

    if (!page.isClosed()) {
      const sendDelay = getRandomDelay(taskDelays, 'waiting');
      addLog(`Waiting ${sendDelay/1000} seconds before sending...`);
      await new Promise(resolve => setTimeout(resolve, sendDelay));
      
      await page.keyboard.press('Enter');
      addLog("Message sent");
      
      const afterSendDelay = getRandomDelay(taskDelays, 'waiting');
      addLog(`Waiting ${afterSendDelay/1000} seconds after sending...`);
      await new Promise(resolve => setTimeout(resolve, afterSendDelay));
    }
  } catch (error) {
    addLog(`Error in sendMessage: ${error.message}`);
    throw error;
  }
}

// Main processing function with improved error handling
async function processMessages(taskId, cookies, friendIds, message) {
  let browser = null;
  let page = null;
  let processedCount = 0;
  const logs = [];
  const taskDelays = createTaskDelays();

  const addLog = (message) => {
    const log = `${new Date().toISOString()} - ${message}`;
    console.log(log);
    logs.push(log);
    if (tasks.has(taskId)) {
      tasks.get(taskId).logs = logs;
    }
  };

  try {
    browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    });

    browsers.set(taskId, browser);

    // Create single page for the entire session
    page = await createNewPage(browser, cookies);
    
    // Initial login
    addLog("Navigating to Facebook...");
    await page.goto("https://www.facebook.com", { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });

    // Verify login
    await page.waitForSelector('[aria-label="Your profile"]', { timeout: 30000 });
    addLog("Successfully logged in using cookies.");

    // Add random delay after login
    const initialDelay = getRandomDelay(taskDelays, 'waiting');
    addLog(`Waiting ${initialDelay/1000} seconds after login...`);
    await new Promise(resolve => setTimeout(resolve, initialDelay));

    // Process each friend using the same page
    for (const [index, friendId] of friendIds.entries()) {
      if (!tasks.has(taskId)) {
        addLog('Task was stopped by user');
        break;
      }

      try {
        addLog(`Processing friend ${friendId} (${processedCount + 1}/${friendIds.length})...`);

        // Navigate to friend's chat using the same page
        let navigationSuccess = false;
        for (let attempt = 0; attempt < 3 && !navigationSuccess; attempt++) {
          try {
            await page.goto(`https://www.facebook.com/messages/t/${friendId}`, {
              waitUntil: 'networkidle2',
              timeout: 60000
            });
            navigationSuccess = true;
          } catch (error) {
            if (attempt === 2) throw error;
            addLog(`Navigation attempt ${attempt + 1} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }

        await sendMessage(page, message, taskDelays, addLog);
        processedCount++;
        
        if (tasks.has(taskId)) {
          tasks.get(taskId).result = { processedCount, totalCount: friendIds.length };
        }

        if (index < friendIds.length - 1) {
          const betweenDelay = getRandomDelay(taskDelays, 'betweenFriends');
          addLog(`Waiting ${betweenDelay/1000/60} minutes before next friend...`);
          await new Promise(resolve => setTimeout(resolve, betweenDelay));
        }

      } catch (error) {
        addLog(`Error processing friend ${friendId}: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 10000));
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
    try {
      if (page && !page.isClosed()) await page.close();
      if (browser) await browser.close();
    } catch (error) {
      console.error('Error in cleanup:', error);
    }
    browsers.delete(taskId);
  }
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