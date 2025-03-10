const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Load config file
const configPath = path.join(__dirname, './config.json');
const users = require(configPath);

(async () => {
  console.log('=== FileLIst Login Authentication Test ===');
  console.log(`Testing ${users.length} account(s)\n`);

  for (const user of users) {
    let browser;
    try {
      console.log(`Testing user: ${user.username}...`);

      // Launch browser with minimal options
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Navigate to login page
      await page.goto('https://filelist.io/login.php', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Fill and submit login form
      await page.type('#username', user.username);
      await page.type('#password', user.password);

      // Submit login form
      await Promise.all([
        page.click('.btn'),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      ]);

      // Check for login success by looking for specific elements
      const isLoggedIn = await page.evaluate(() => {
        // Check for footer element
        const footerExists = document.querySelector('#footer') !== null;

        // Check for logout link in the statusbar
        const logoutLinkExists =
          document.querySelector(
            '#wrapper > div.mainheader > div > div.statusbar > div:nth-child(2) > div:nth-child(1) > a:nth-child(4)'
          ) !== null;

        return footerExists || logoutLinkExists;
      });

      if (isLoggedIn) {
        console.log(`✅ SUCCESS: ${user.username} - Login successful`);

        // Log to file
        const resultLog = `${new Date().toISOString()} - ${user.username} - LOGIN SUCCESSFUL\n`;
        fs.appendFileSync('login_test_results.txt', resultLog);

        // Perform logout
        try {
          const logoutSelector =
            '#wrapper > div.mainheader > div > div.statusbar > div:nth-child(2) > div:nth-child(1) > a:nth-child(4)';
          await Promise.all([
            page.click(logoutSelector),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
          ]);
        } catch (logoutError) {
          console.log(`Note: Logout process failed but login test was successful`);
        }
      } else {
        const errorMessage = await page.evaluate(() => {
          const errorDiv = document.querySelector(
            'div[style*="font-size: 14px;color: #fff;font-weight:bold;"]'
          );
          return errorDiv ? errorDiv.innerText : 'Unknown login error';
        });

        console.log(`❌ FAILED: ${user.username} - Login failed: ${errorMessage}`);

        // Log to file
        const resultLog = `${new Date().toISOString()} - ${
          user.username
        } - LOGIN FAILED: ${errorMessage}\n`;
        fs.appendFileSync('login_test_results.txt', resultLog);
      }
    } catch (error) {
      console.error(`❌ ERROR: ${user.username} - ${error.message}`);

      // Log to file
      const resultLog = `${new Date().toISOString()} - ${user.username} - ERROR: ${
        error.message
      }\n`;
      fs.appendFileSync('login_test_results.txt', resultLog);
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    console.log(''); // Empty line for better readability
  }

  console.log('=== Login Test Complete ===');
})();
