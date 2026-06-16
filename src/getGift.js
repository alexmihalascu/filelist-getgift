const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Load config file
const configPath = path.join(__dirname, './config.json');
const users = require(configPath);

(async () => {
  for (const user of users) {
    let browser;
    try {
      console.log(`Processing user: ${user.username}...`);

      // Launch with more options for stability
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--disable-web-security',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
        timeout: 30000,
      });

      const page = await browser.newPage();

      // Set a realistic user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Add timeout and retry logic for navigation
      const maxRetries = 3;
      let retries = 0;
      let loginSuccess = false;

      while (retries < maxRetries && !loginSuccess) {
        try {
          // Navigate to login page with longer timeout
          await page.goto('https://filelist.io/login.php', {
            waitUntil: 'networkidle2',
            timeout: 30000,
          });

          // Check if login form exists
          const usernameSelector = '#username';
          await page.waitForSelector(usernameSelector, { timeout: 10000 });

          // Fill and submit login form
          await page.type(usernameSelector, user.username);
          await page.type('#password', user.password);

          // Wait a bit before clicking to avoid being detected as a bot
          await page.waitForTimeout(1000 + Math.random() * 2000);

          await Promise.all([
            page.click('.btn'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
          ]);

          // Check for login failure
          if (page.url().includes('takelogin.php')) {
            const loginFailedMessage = await page.evaluate(() => {
              const errorDiv = document.querySelector(
                'div[style*="font-size: 14px;color: #fff;font-weight:bold;"]'
              );
              return errorDiv ? errorDiv.innerText : 'Unknown login error';
            });

            throw new Error(
              `Login failed for user: ${user.username}. Message: ${loginFailedMessage}`
            );
          }

          loginSuccess = true;
          console.log(`Successfully logged in as ${user.username}`);
        } catch (error) {
          retries++;
          console.warn(`Attempt ${retries}/${maxRetries} failed: ${error.message}`);

          if (retries >= maxRetries) {
            throw new Error(`Max retries reached for user ${user.username}: ${error.message}`);
          }

          // Wait before retrying
          await page.waitForTimeout(5000);
        }
      }

      // Navigate to gift page with retry logic
      retries = 0;
      let giftSuccess = false;

      while (retries < maxRetries && !giftSuccess) {
        try {
          console.log(`Navigating to gift page for ${user.username}...`);

          // Add random wait to make it look more human
          await page.waitForTimeout(2000 + Math.random() * 3000);

          await page.goto('https://filelist.io/gift.php', {
            waitUntil: 'networkidle2',
            timeout: 30000,
          });

          // Check for content on the gift page
          await page.waitForSelector('.cblock-innercontent', { timeout: 10000 });

          const message = await page.$eval('.cblock-innercontent', element =>
            element.textContent.trim()
          );

          console.log(`Gift for user: ${user.username}`);
          console.log(message);

          // Log the results to a file
          const logData = `${new Date().toISOString()} - User: ${user.username} - ${message}\n`;
          fs.appendFileSync('gift_log.txt', logData);

          giftSuccess = true;
        } catch (error) {
          retries++;
          console.warn(`Gift page attempt ${retries}/${maxRetries} failed: ${error.message}`);

          if (retries >= maxRetries) {
            throw new Error(`Max retries reached for gift page: ${error.message}`);
          }

          // Wait before retrying
          await page.waitForTimeout(5000);
        }
      }

      // Logout properly
      try {
        console.log(`Logging out user: ${user.username}...`);
        await page.waitForTimeout(1000);
        const logoutLink = await page.$('a[href^="/logout.php?id="]');

        if (logoutLink) {
          await Promise.all([
            page.click('a[href^="/logout.php?id="]'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
          ]);
          console.log(`Successfully logged out ${user.username}`);
        } else {
          console.warn(`Logout link not found for ${user.username}`);
        }
      } catch (logoutError) {
        console.warn(`Error during logout: ${logoutError.message}`);
      }
    } catch (error) {
      console.error(`Error processing user ${user.username}:`, error);
      // Continue with next user instead of breaking
      continue;
    } finally {
      if (browser) {
        await browser.close();
        console.log(`Browser closed for ${user.username}`);
      }
    }
  }
  console.log('All users processed.');
})();
