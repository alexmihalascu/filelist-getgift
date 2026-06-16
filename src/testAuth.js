'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const {
  loadUsers,
  getLaunchOptions,
  ensureBrowser,
  USER_AGENT,
  CONFIG_PATH,
  RESULTS_LOG_PATH,
} = require('./utils');

/**
 * Test login for a single account.
 *
 * @param {{username: string, password: string}} user
 * @param {(line: string) => void} log
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function testOne(user, log) {
  let browser;
  try {
    log(`Testing user: ${user.username}...`);

    browser = await puppeteer.launch(getLaunchOptions());
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);

    await page.goto('https://filelist.io/login.php', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await page.type('#username', user.username);
    await page.type('#password', user.password);

    await Promise.all([
      page.click('.btn'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
    ]);

    // Logged in only if a logout link exists AND we left takelogin.php.
    const isLoggedIn =
      !page.url().includes('takelogin.php') &&
      (await page.evaluate(() => document.querySelector('a[href^="/logout.php?id="]') !== null));

    if (isLoggedIn) {
      log(`✅ Autentificare reușită: ${user.username}`);
      fs.appendFileSync(
        RESULTS_LOG_PATH,
        `${new Date().toISOString()} - ${user.username} - LOGIN SUCCESSFUL\n`,
      );

      // Best-effort logout so the session does not linger.
      try {
        await Promise.all([
          page.click('a[href^="/logout.php?id="]'),
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
        ]);
      } catch {
        log('Note: Logout failed but login test was successful');
      }

      return { success: true, message: `Autentificare reușită pentru ${user.username}` };
    }

    const errorMessage = await page.evaluate(() => {
      const errorDiv = document.querySelector(
        'div[style*="font-size: 14px;color: #fff;font-weight:bold;"]',
      );
      return errorDiv ? errorDiv.innerText : 'Unknown login error';
    });

    log(`❌ Autentificare eșuată: ${user.username} - ${errorMessage}`);
    fs.appendFileSync(
      RESULTS_LOG_PATH,
      `${new Date().toISOString()} - ${user.username} - LOGIN FAILED: ${errorMessage}\n`,
    );
    return { success: false, message: `Autentificare eșuată: ${errorMessage}` };
  } catch (error) {
    log(`❌ Autentificare eșuată: ${user.username} - ${error.message}`);
    fs.appendFileSync(
      RESULTS_LOG_PATH,
      `${new Date().toISOString()} - ${user.username} - ERROR: ${error.message}\n`,
    );
    return { success: false, message: `Autentificare eșuată: ${error.message}` };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Test authentication for one user or for every user in a config file.
 *
 * @param {object} [options]
 * @param {{username: string, password: string}} [options.user] - single user to test
 * @param {string} [options.configPath] - config file to read when no user is given
 * @param {(line: string) => void} [options.logger]
 * @returns {Promise<{ success: boolean, message: string }>} result of the last/only user
 */
async function testAuth({ user, configPath = CONFIG_PATH, logger = console.log } = {}) {
  const log = line => logger(String(line));

  const users = user ? [user] : loadUsers(configPath);
  await ensureBrowser(log); // download Chromium on first run if needed

  log('=== FileList Login Authentication Test ===');
  log(`Testing ${users.length} account(s)`);

  let last = { success: false, message: 'No accounts tested.' };
  for (const u of users) {
    last = await testOne(u, log);
    log('');
  }

  log('=== Login Test Complete ===');
  return last;
}

module.exports = { testAuth };

// CLI entry point: `node src/testAuth.js [configPath]`
if (require.main === module) {
  const configArg = process.argv[2];
  const configPath = configArg ? path.resolve(configArg) : CONFIG_PATH;
  testAuth({ configPath })
    .then(result => {
      process.exitCode = result.success ? 0 : 1;
    })
    .catch(error => {
      console.error(`Configuration error: ${error.message}`);
      process.exitCode = 1;
    });
}
