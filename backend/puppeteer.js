const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('./logger');

puppeteer.use(StealthPlugin());

const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function processMessages(cookies, friendIds, message, job) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  let processedCount = 0;

  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setCookie(...cookies);

    logger.info("Navigating to Facebook...");
    await page.goto("https://www.facebook.com", { waitUntil: 'networkidle2', timeout: 60000 });

    logger.info("Waiting for profile selector...");
    await page.waitForSelector('[aria-label="Your profile"]', { timeout: 30000 });
    logger.info("Successfully logged in using cookies.");

    // Process each friend
    for (const [index, friendId] of friendIds.entries()) {
      try {
        await job.progress(Math.floor((index / friendIds.length) * 100));
        
        logger.info(`Processing friend ${friendId} (${index + 1}/${friendIds.length})`);
        await page.goto(`https://www.facebook.com/messages/t/${friendId}`, { 
          waitUntil: 'networkidle2', 
          timeout: 60000 
        });

          // Utility function to wait for an element with retries
          const waitForElement = async (selector, timeout = 15000) => {
            const startTime = Date.now();
            while (Date.now() - startTime < timeout) {
                const element = await page.$(selector);
                if (element) return element;

                const delay = randomDelay(3000, 12000); // Random delay between 3 to 12 seconds
                console.log(`Element not found. Retrying in ${delay / 1000} seconds...`);
                await new Promise((resolve) => setTimeout(resolve, delay)); // Use setTimeout for delay
            }
            throw new Error(`Element with selector "${selector}" not found within ${timeout}ms.`);
        };

        // Function to handle the "Continue" button
        const handleContinueButton = async () => {
            try {
                console.log('Looking for the "Continue" button...');
                const continueButton = await waitForElement(
                    'div[aria-label*="Continue"][role="button"], div[aria-label*="Continue"][role="button"] *'
                );

                if (continueButton) {
                    const delay = randomDelay(4000, 9000); // Random delay between 4 to 9 seconds
                    console.log(`"Continue" button found. Clicking after ${delay / 1000} seconds...`);
                    await new Promise((resolve) => setTimeout(resolve, delay)); // Use setTimeout for delay
                    await continueButton.click();
                    console.log('"Continue" button clicked.');
                }
            } catch (error) {
                console.warn('No "Continue" button found, proceeding...');
            }
        };


        // Function to send the message
        const sendMessage = async () => {
            try {
                // Wait for the message input box to load
                console.log("Waiting for the message input box...");
                const chatTextBoxContainer = await waitForElement('div[aria-label="Message"][contenteditable="true"][role="textbox"]');
                console.log("Chat text box loaded.");

                // Focus on the chat text box
                await chatTextBoxContainer.focus();
                console.log("Focused on the chat text box.");

                // Simulate human-like typing with delays
                console.log("Typing message...");
                for (let char of message) {
                    await page.keyboard.type(char, { delay: randomDelay(100, 200) }); // Random delay between 100-200ms per keystroke
                }
                console.log("Typed message:", message);

                // Wait for a random delay before sending
                const sendDelay = randomDelay(2000, 7000); // Random delay between 2 to 7 seconds
                console.log(`Waiting ${sendDelay / 1000} seconds before sending...`);
                await new Promise((resolve) => setTimeout(resolve, sendDelay)); // Use setTimeout for delay

                // Simulate pressing the Enter key to send the message
                console.log("Pressing Enter to send the message...");
                await page.keyboard.press("Enter");
                console.log("Message sent successfully.");

                // Wait for a random delay after sending (10 to 20 seconds)
                const postSendDelay = randomDelay(10000, 20000); // Random delay between 10 to 20 seconds
                console.log(`Waiting ${postSendDelay / 1000} seconds after sending...`);
                await new Promise((resolve) => setTimeout(resolve, postSendDelay)); // Use setTimeout for delay
            } catch (error) {
                console.error("Error while sending message:", error.message);
                throw error; // Re-throw the error to be caught by the outer try-catch block
            }
        };

          // Handle the "Continue" button if it appears
          await handleContinueButton();

          // Send the message
          await sendMessage();

        processedCount++;
        
        // Add delay between friends
        if (index < friendIds.length - 1) {
          const delay = randomDelay(300000, 600000);
          logger.info(`Waiting ${delay/1000} seconds before next message...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        logger.error(`Error processing friend ${friendId}:`, error);
      }
    }

    return {
      processedCount,
      totalCount: friendIds.length
    };
  } catch (error) {
    logger.error('Critical error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = { processMessages }; 