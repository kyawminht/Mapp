const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 3001;

// Store tasks in memory
const tasks = new Map();

// Add this to your existing Map to track running browsers
const browsers = new Map();

app.use(cors());
app.use(bodyParser.json());

// Function to generate random delay from a set of values
const randomDelay = (values) => values[Math.floor(Math.random() * values.length)] * 1000;

// Create a function to generate random delays for each task
const createTaskDelays = () => {
  return {
    typing: [
      Math.floor(Math.random() * (400 - 200) + 200), // 200-400ms
      Math.floor(Math.random() * (500 - 300) + 300), // 300-500ms
      Math.floor(Math.random() * (600 - 400) + 400)  // 400-600ms
    ],
    waiting: [
      Math.floor(Math.random() * (8000 - 3000) + 3000),    // 3-8s
      Math.floor(Math.random() * (12000 - 6000) + 6000),   // 6-12s
      Math.floor(Math.random() * (15000 - 10000) + 10000)  // 10-15s
    ],
    betweenFriends: [
      Math.floor(Math.random() * (420000 - 300000) + 300000),  // 5-7min
      Math.floor(Math.random() * (600000 - 420000) + 420000),  // 7-10min
      Math.floor(Math.random() * (900000 - 600000) + 600000)   // 10-15min
    ]
  };
};

// Function to get a random delay from task-specific delays
const getRandomDelay = (delays, type) => {
  const delayArray = delays[type];
  return delayArray[Math.floor(Math.random() * delayArray.length)];
};

// Function to process messages
async function processMessages(taskId, cookies, friendIds, message) {
  // Create unique delays for this task
  const taskDelays = createTaskDelays();
  
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-notifications'
    ],
    ignoreDefaultArgs: ['--enable-automation']
  });

  browsers.set(taskId, browser);
  const page = await browser.newPage();
  
  // Set a larger viewport
  await page.setViewport({
    width: 1920,
    height: 1080
  });

  let processedCount = 0;
  const logs = [];

  const addLog = (message) => {
    const log = `${new Date().toISOString()} - ${message}`;
    console.log(log); // Also log to console
    logs.push(log);
    tasks.get(taskId).logs = logs;
  };

  try {
    addLog("Starting message sending process...");
    
    // Set a realistic user-agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Set cookies for authentication
    await page.setCookie(...cookies);

    // Navigate to Facebook
    addLog("Navigating to Facebook...");
    await page.goto("https://www.facebook.com", { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for the page to load and verify login
    addLog("Waiting for profile selector...");
    await page.waitForSelector('[aria-label="Your profile"]', { timeout: 30000 });
    addLog("Successfully logged in using cookies.");

    // Add a random delay between 20 to 40 seconds after logging in
    const delayAfterLogin = randomDelay([3, 5, 6, 2, 1]);
    addLog(`Waiting ${delayAfterLogin / 1000} seconds before navigating to the first message...`);
    await new Promise((resolve) => setTimeout(resolve, delayAfterLogin));

    // Utility function to wait for an element with retries
    const waitForElement = async (selector, timeout = 40000) => {
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        const element = await page.$(selector);
        if (element) return element;

        const delay = randomDelay([3, 5, 6, 2, 9]);
        addLog(`Element not found. Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      throw new Error(`Element with selector "${selector}" not found within ${timeout}ms.`);
    };

    // Function to handle the "Continue" button
    const handleContinueButton = async () => {
      try {
        addLog('Looking for the "Continue" button...');
        const continueButton = await waitForElement(
          'div[aria-label*="Continue"][role="button"], div[aria-label*="Continue"][role="button"] *'
        );

        if (continueButton) {
          const delay = randomDelay([3, 5, 6, 2, 1,4]);
          addLog(`"Continue" button found. Clicking after ${delay / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          await continueButton.click();
          addLog('"Continue" button clicked.');
        }
      } catch (error) {
        addLog('No "Continue" button found, proceeding...');
      }
    };

    // Function to send message
    const sendMessage = async () => {
      try {
        addLog("Waiting for the message input box...");
        const chatTextBoxContainer = await waitForElement('div[aria-label="Message"][contenteditable="true"][role="textbox"]');
        
        const initialDelay = getRandomDelay(taskDelays, 'waiting');
        addLog(`Chat text box found, waiting ${initialDelay/1000} seconds before interacting...`);
        await new Promise(resolve => setTimeout(resolve, initialDelay));

        // Click with unique delay
        addLog("Clicking the chat text box...");
        await chatTextBoxContainer.click();
        await new Promise(resolve => setTimeout(resolve, getRandomDelay(taskDelays, 'waiting')));
        
        // Type with unique delays
        for (let char of message) {
          const typingDelay = getRandomDelay(taskDelays, 'typing');
          await page.keyboard.type(char, { delay: typingDelay });
          
          if (message.indexOf(char) % 10 === 0) {
            const pauseDelay = getRandomDelay(taskDelays, 'waiting');
            await new Promise(resolve => setTimeout(resolve, pauseDelay));
            addLog(`Typing progress: ${Math.round((message.indexOf(char) / message.length) * 100)}%`);
          }
        }

        const sendDelay = getRandomDelay(taskDelays, 'waiting');
        addLog(`Waiting ${sendDelay/1000} seconds before sending...`);
        await new Promise(resolve => setTimeout(resolve, sendDelay));

        await page.keyboard.press("Enter");
        addLog("Message sent");

        const postSendDelay = getRandomDelay(taskDelays, 'waiting');
        addLog(`Waiting ${postSendDelay/1000} seconds after sending...`);
        await new Promise(resolve => setTimeout(resolve, postSendDelay));
      } catch (error) {
        addLog(`Error in sendMessage: ${error.message}`);
        throw error;
      }
    };

    // Update the task state with progress
    const updateTaskProgress = (taskId, processedCount, totalCount) => {
      const task = tasks.get(taskId);
      if (task) {
        task.result = { processedCount, totalCount };
        task.friendIds = task.friendIds || friendIds.join(','); // Store friend IDs if not already stored
      }
    };

    // Process each friend
    for (const [index, friendId] of friendIds.entries()) {
      try {
        addLog(`Processing friend: ${friendId}...`);
        addLog(`Progress: ${processedCount} out of ${friendIds.length} friends processed.`);

        // Update task progress before processing each friend
        updateTaskProgress(taskId, processedCount, friendIds.length);

        // Navigate to the friend's message URL
        addLog(`Navigating to ${friendId}'s message URL...`);
        await page.goto(`https://www.facebook.com/messages/t/${friendId}`, { 
          waitUntil: 'networkidle2', 
          timeout: 60000 
        });
        addLog(`Navigated to ${friendId}'s message URL.`);

        // Handle the "Continue" button if it appears
        await handleContinueButton();

        // Send the message
        await sendMessage();

        // Increment the processed counter and update progress
        processedCount++;
        updateTaskProgress(taskId, processedCount, friendIds.length);

        // Add delay after processing the current friend
        if (index < friendIds.length - 1) {
          const betweenFriendsDelay = getRandomDelay(taskDelays, 'betweenFriends');
          addLog(`Waiting ${betweenFriendsDelay/1000/60} minutes before next friend...`);
          await new Promise(resolve => setTimeout(resolve, betweenFriendsDelay));
        }
      } catch (error) {
        addLog(`Error processing friend ${friendId}: ${error.message}`);
        addLog("Continuing to the next friend...");
      }
    }

    // Final progress report
    tasks.get(taskId).status = 'completed';
    addLog(`Finished processing all friends. Total processed: ${processedCount} out of ${friendIds.length}.`);
  } catch (error) {
    tasks.get(taskId).status = 'failed';
    addLog(`Critical error: ${error.message}`);
  } finally {
    browsers.delete(taskId);
    await browser.close();
  }
}

// Routes
app.post('/api/send-messages', async (req, res) => {
  try {
    const { cookies, friendIds, message } = req.body;
    const taskId = Date.now().toString();

    // Create new task
    tasks.set(taskId, {
      id: taskId,
      status: 'running',
      logs: [],
      timestamp: new Date().toISOString()
    });

    // Process messages in background
    processMessages(taskId, cookies, friendIds, message);

    res.json({ taskId, status: 'running' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get task status and logs
app.get('/api/task/:taskId', (req, res) => {
  const task = tasks.get(req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// Get all tasks
app.get('/api/tasks', (req, res) => {
  const taskList = Array.from(tasks.values());
  res.json(taskList);
});

// Add new route to stop tasks
app.post('/api/task/:taskId/stop', async (req, res) => {
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
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});