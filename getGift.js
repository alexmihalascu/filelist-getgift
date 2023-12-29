const puppeteer = require('puppeteer');
const config = require('./config.json');

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto('https://filelist.io/login.php');

    await page.waitForSelector('#username', { timeout: 5000 });
    await page.type('#username', config.username);
    await page.type('#password', config.password);
    await page.click('.btn');

    await page.goto('https://filelist.io/gift.php');

    const message = await page.$eval('.cblock-innercontent', element => element.textContent.trim());

    console.log(message); 

    await page.click('a[href^="/logout.php?id="]');

    await browser.close();
})();
