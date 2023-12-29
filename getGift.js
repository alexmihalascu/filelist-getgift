const puppeteer = require('puppeteer');
const users = require('./config.json');

(async () => {
    for (const user of users) {
        let browser;
        try {
            browser = await puppeteer.launch({ headless: "new" });
            const page = await browser.newPage();

            await page.goto('https://filelist.io/login.php');
            await page.waitForSelector('#username', { timeout: 5000 });
            await page.type('#username', user.username);
            await page.type('#password', user.password);
            await page.click('.btn');

            if (page.url().includes('takelogin.php')) {
                const loginFailedMessage = await page.evaluate(() => {
                    const errorDiv = document.querySelector('div[style*="font-size: 14px;color: #fff;font-weight:bold;"]');
                    return errorDiv ? errorDiv.innerText : '';
                });

                throw new Error(`Login failed for user: ${user.username}. Message: ${loginFailedMessage}`);
            }

            await page.goto('https://filelist.io/gift.php');
            await page.waitForSelector('.cblock-innercontent', { timeout: 5000 });
            const message = await page.$eval('.cblock-innercontent', element => element.textContent.trim());
            console.log("Gift for user:", user.username);
            console.log(message); 

            await page.click('a[href^="/logout.php?id="]');

        } catch (error) {
            console.error('An error occurred:', error);
            break;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
    console.log("Done!");
})();
