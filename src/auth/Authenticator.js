const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/**
 * LoginInfo class to log in to the DPG Media API (for Qmusic).
 * Uses Puppeteer to mimic the login process of the Qmusic website to obtain a JWT token.
 *
 * @class Authenticator
 * @version 3.0.0
 * @since 1.1.0
 */
class Authenticator {

    /**
     * Returns the bearer token for the given credentials using a headless browser.
     * @param {string} username The username of the account.
     * @param {string} password The password of the account.
     * @returns {Promise<string|null>} Bearer token or null if the credentials are invalid.
     */
    async processLogin(username, password) {
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        try {
            // Launch a headless browser instance
            const page = await browser.newPage();
            // Step 1: Navigate to the login page to start the authentication flow.
            await page.goto('https://qmusic.nl/', {waitUntil: 'networkidle2'});

            // wait for cookie consent popup and accept it
            await page.$('#pg-host-shadow-root')
            await page.click('>>> #pg-accept-btn');
            await page.waitForNavigation();

            await page.goto('https://qmusic.nl/login');

            // Step 2: On the identify page, enter the email.
            // The browser will execute the necessary anti-bot scripts in the background.
            await page.waitForSelector('#username');
            await page.focus('#username');
            await page.type('#username', username);
            await page.click('button[type="submit"]');

            // Step 3: On the login page, enter the password.
            await page.waitForSelector('#password');
            await page.type('#password', password);
            await page.click('button[type="submit"]');

            // wait for authentication to complete
            await page.waitForFunction(
                'window.location.href === "https://qmusic.nl/"',
                { timeout: 15000 }
            );

            // Step 4: The final page sets the token. We can now extract it from the page's localStorage.
            const token = await page.evaluate(() => {
                // This code runs in the browser's context
                return localStorage.getItem('radio-auth-token');
            });

            await browser.close();
            return token;
        } catch (e) {
            console.error("An error occurred during the login process:", e.message);
            await browser?.close();
            return null;
        }
    }
}

module.exports = Authenticator;