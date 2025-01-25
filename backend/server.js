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

// Function to generate random delay
const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Function to process messages
async function processMessages(taskId, cookies, friendIds, message) {
  const browser = await puppeteer.launch({ 
    headless: true, // Changed to true for production
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
    const delayAfterLogin = randomDelay(20000, 40000);
    addLog(`Waiting ${delayAfterLogin / 1000} seconds before navigating to the first message...`);
    await new Promise((resolve) => setTimeout(resolve, delayAfterLogin));

    // Utility function to wait for an element with retries
    const waitForElement = async (selector, timeout = 30000) => {
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        const element = await page.$(selector);
        if (element) return element;

        const delay = randomDelay(3000, 12000);
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
          const delay = randomDelay(4000, 9000);
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
        addLog("Chat text box found, waiting 3 seconds before interacting...");
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Click the text box first
        addLog("Clicking the chat text box...");
        await chatTextBoxContainer.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        addLog("Focusing on the chat text box...");
        await chatTextBoxContainer.focus();
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Clear any existing text
        addLog("Clearing any existing text...");
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await new Promise(resolve => setTimeout(resolve, 1000));

        addLog("Starting to type message...");
        for (let char of message) {
          await page.keyboard.type(char, { delay: randomDelay(100, 200) });
          // Log every few characters to show progress
          if (message.indexOf(char) % 10 === 0) {
            addLog(`Typing progress: ${Math.round((message.indexOf(char) / message.length) * 100)}%`);
          }
        }
        addLog("Finished typing message");

        const sendDelay = randomDelay(2000, 4000);
        addLog(`Waiting ${sendDelay / 1000} seconds before pressing Enter...`);
        await new Promise((resolve) => setTimeout(resolve, sendDelay));

        addLog("Pressing Enter to send message...");
        await page.keyboard.press("Enter");

        // Wait to verify message appears in chat
        addLog("Verifying message appears in chat...");
        try {
          await page.waitForFunction(
            (msg) => {
              const messages = document.querySelectorAll('[role="row"]');
              return Array.from(messages).some(m => m.textContent.includes(msg));
            },
            { timeout: 10000 },
            message
          );
          addLog("Message confirmed to be sent and visible in chat");
        } catch (error) {
          addLog("Warning: Could not confirm message in chat");
          throw new Error("Message might not have been sent successfully");
        }

        const postSendDelay = randomDelay(5000, 10000);
        addLog(`Waiting ${postSendDelay / 1000} seconds after sending...`);
        await new Promise((resolve) => setTimeout(resolve, postSendDelay));
      } catch (error) {
        addLog(`Error in sendMessage: ${error.message}`);
        throw error;
      }
    };

    // Process each friend
    for (const [index, friendId] of friendIds.entries()) {
      try {
        addLog(`Processing friend: ${friendId}...`);
        addLog(`Progress: ${processedCount} out of ${friendIds.length} friends processed.`);

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

        // Increment the processed counter
        processedCount++;

        if (index < friendIds.length - 1) {
          const delayBetweenFriends = randomDelay(300000, 600000); // 5-10 minutes
          addLog(`Waiting ${delayBetweenFriends / 1000 / 60} minutes before sending the next message...`);
          await new Promise(resolve => setTimeout(resolve, delayBetweenFriends));
        }
      } catch (error) {
        addLog(`Error processing friend ${friendId}: ${error.message}`);
        addLog("Continuing to the next friend...");
      }
    }

    // Final progress report
    tasks.get(taskId).status = 'completed';
    tasks.get(taskId).result = { processedCount, totalCount: friendIds.length };
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