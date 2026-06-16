'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const {
  sleep,
  loadUsers,
  getLaunchOptions,
  ensureBrowser,
  USER_AGENT,
  GIFT_LOG_PATH,
} = require('./utils');

const MAX_RETRIES = 3;

/**
 * Claim the daily gift for every configured user.
 *
 * Works both as an importable function (called in-process by the Electron main
 * process) and as a CLI script. All progress is reported through `logger` so
 * the GUI does not have to parse stdout.
 *
 * @param {object} [options]
 * @param {(line: string) => void} [options.logger] - receives progress lines
 * @param {string} [options.configPath] - override the config file location
 * @returns {Promise<{ processed: number, failed: number }>}
 */
async function runGift({ logger = console.log, configPath } = {}) {
  const log = line => logger(String(line));

  const users = loadUsers(configPath);
  await ensureBrowser(log); // download Chromium on first run if needed
  let failed = 0;

  for (const user of users) {
    let browser;
    try {
      log(`Processing user: ${user.username}...`);

      browser = await puppeteer.launch(
        getLaunchOptions({
          extraArgs: ['--disable-web-security', '--disable-accelerated-2d-canvas'],
        }),
      );

      const page = await browser.newPage();
      await page.setUserAgent(USER_AGENT);

      // --- Login (with retries) ---
      let retries = 0;
      let loginSuccess = false;

      while (retries < MAX_RETRIES && !loginSuccess) {
        try {
          await page.goto('https://filelist.io/login.php', {
            waitUntil: 'networkidle2',
            timeout: 30000,
          });

          const usernameSelector = '#username';
          await page.waitForSelector(usernameSelector, { timeout: 10000 });

          await page.type(usernameSelector, user.username);
          await page.type('#password', user.password);

          // Random wait so the submit looks less bot-like.
          await sleep(1000 + Math.random() * 2000);

          await Promise.all([
            page.click('.btn'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
          ]);

          if (page.url().includes('takelogin.php')) {
            const loginFailedMessage = await page.evaluate(() => {
              const errorDiv = document.querySelector(
                'div[style*="font-size: 14px;color: #fff;font-weight:bold;"]',
              );
              return errorDiv ? errorDiv.innerText : 'Unknown login error';
            });
            throw new Error(
              `Login failed for user: ${user.username}. Message: ${loginFailedMessage}`,
            );
          }

          loginSuccess = true;
          log(`Successfully logged in as ${user.username}`);
        } catch (error) {
          retries++;
          log(`Attempt ${retries}/${MAX_RETRIES} failed: ${error.message}`);
          if (retries >= MAX_RETRIES) {
            throw new Error(`Max retries reached for user ${user.username}: ${error.message}`);
          }
          await sleep(5000);
        }
      }

      // --- Gift page (with retries) ---
      retries = 0;
      let giftSuccess = false;

      while (retries < MAX_RETRIES && !giftSuccess) {
        try {
          log(`Navigating to gift page for ${user.username}...`);
          await sleep(2000 + Math.random() * 3000);

          await page.goto('https://filelist.io/gift.php', {
            waitUntil: 'networkidle2',
            timeout: 30000,
          });

          await page.waitForSelector('.cblock-innercontent', { timeout: 10000 });
          const message = await page.$eval('.cblock-innercontent', element =>
            element.textContent.trim(),
          );

          log(`Gift for user: ${user.username}`);
          log(message);

          const logData = `${new Date().toISOString()} - User: ${user.username} - ${message}\n`;
          fs.appendFileSync(GIFT_LOG_PATH, logData);

          giftSuccess = true;
        } catch (error) {
          retries++;
          log(`Gift page attempt ${retries}/${MAX_RETRIES} failed: ${error.message}`);
          if (retries >= MAX_RETRIES) {
            throw new Error(`Max retries reached for gift page: ${error.message}`);
          }
          await sleep(5000);
        }
      }

      // --- Logout (best-effort) ---
      try {
        log(`Logging out user: ${user.username}...`);
        await sleep(1000);
        const logoutLink = await page.$('a[href^="/logout.php?id="]');
        if (logoutLink) {
          await Promise.all([
            page.click('a[href^="/logout.php?id="]'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
          ]);
          log(`Successfully logged out ${user.username}`);
        } else {
          log(`Logout link not found for ${user.username}`);
        }
      } catch (logoutError) {
        log(`Error during logout: ${logoutError.message}`);
      }
    } catch (error) {
      failed++;
      log(`Error processing user ${user.username}: ${error.message}`);
      // Continue with the next user instead of breaking the whole run.
    } finally {
      if (browser) {
        await browser.close();
        log(`Browser closed for ${user.username}`);
      }
    }
  }

  log('All users processed.');
  return { processed: users.length, failed };
}

module.exports = { runGift };

// CLI entry point.
if (require.main === module) {
  runGift().catch(error => {
    console.error(`Fatal error: ${error.message}`);
    process.exitCode = 1;
  });
}
