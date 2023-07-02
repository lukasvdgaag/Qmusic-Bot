const axios = require("axios");

const {wrapper} = require('axios-cookiejar-support');
const {HttpCookieAgent, HttpsCookieAgent} = require('http-cookie-agent/http');
const {CookieJar} = require('tough-cookie');

const qs = require('querystring');


/**
 * LoginInfo class to log in to the Qmusic API.
 * Mimics the login process of the Qmusic website to obtain a bearer token.
 *
 * @class LoginInfo
 * @param {string} username - The username of the account to login as.
 * @param {string} password - The password of the account to login as.
 * @version 1.0.0
 * @since 1.1.0
 */
class LoginInfo {

    constructor(username, password, bearerToken = null) {
        this.username = username;
        this.password = password;
        this.bearerToken = bearerToken;

        this.cookieJar = new CookieJar();

        axios.defaults.httpAgent = new HttpCookieAgent({
            jar: this.cookieJar,
            keepAlive: true,
            rejectUnauthorized: false,
        });
        axios.defaults.httpsAgent = new HttpsCookieAgent({
            jar: this.cookieJar,
            keepAlive: true,
            rejectUnauthorized: false,
        });
        this.instance = axios.create({
            withCredentials: true,
            jar: this.cookieJar,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Accept': '*/*'
            }
        });

        this.instance.interceptors.request.use(async (config) => {
            config.headers.Cookie = await this.cookieJar.getCookieString(config.url);
            return config;
        });
        // this.instance = wrapper(this.instance);
    }

    async processLogin() {
        await this.cookieJar.removeAllCookiesSync();

        try {
            // Request the credentials
            let response = await this.instance.get('https://myprivacy.dpgmedia.nl/consent?siteKey=ewjhEFT3YBV10QQd&callbackUrl=https%3a%2f%2fqmusic.nl%2fprivacy%2faccept%3foriginalUrl%3d%252f');
            await this.updateCookies(response);

            let cookies = await this.cookieJar.getCookies('https://myprivacy.dpgmedia.nl/');
            const authIdCookie = cookies.filter(a => a.key === 'authId')[0].value;

            // Accept the DPG Media Cookie Policy
            response = await this.instance.get(`https://qmusic.nl/privacy/accept?originalUrl=%2F&authId=${authIdCookie}`);
            await this.updateCookies(response);

            // Get the CSRF token
            response = await this.instance.get('https://qmusic.nl/_csrf/?origin=https%3A%2F%2Fqmusic.nl&domain=.qmusic.nl');
            await this.updateCookies(response);

            // Retrieve the SSO session ticket
            response = await this.instance.get('https://login.dpgmedia.nl/authorize/sso?client_id=qmusicnl-web&redirect_uri=https%3A%2F%2Fqmusic.nl%2Flogin%2Fcallback&response_type=code&scope=profile+email+address+phone+openid&state=https%3A%2F%2Fqmusic.nl%2F', {
                maxRedirects: 0,
                validateStatus: (status) => status === 303
            });
            await this.updateCookies(response);

            response = await this.instance.get(`https://login.dpgmedia.nl/identify?client_id=qmusicnl-web`);
            await this.updateCookies(response);

            // Login to the DPG Media account
            const loginPayload = new FormData();
            loginPayload.append('username', this.username);
            loginPayload.append('password', this.password);
            const encodedEmail = this.encodeEmail(this.username);
            const loginUrl = `https://login.dpgmedia.nl/login?client_id=qmusicnl-web&email=${encodedEmail}`;
            response = await this.instance.post(loginUrl, loginPayload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Referer': loginUrl,
                },
            });
            await this.updateCookies(response);

            // Continue the login process
            response = await this.instance.get('https://login.dpgmedia.nl/authorize/continue/sso?client_id=qmusicnl-web', {
                maxRedirects: 0,
                validateStatus: (status) => status === 303
            });
            await this.updateCookies(response);

            // request the redirect url of the previous response
            response = await this.instance.get(response.headers.location, {
                maxRedirects: 0,
                validateStatus: (status) => status === 303
            });
            await this.updateCookies(response);

            // request the redirect url of the previous response
            response = await this.instance.get(response.headers.location, {
                maxRedirects: 0
            });
            await this.updateCookies(response);

            this.bearerToken = this.extractBearerTokenFromHtml(response.data);
        } catch (e) {
            console.error(e);
            this.bearerToken = null;
        }
        return this.bearerToken;
    }

    encodeEmail(email) {
        return Buffer.from(email).toString('base64');
    }

    extractBearerTokenFromHtml(html) {
        const match = html.match(/localStorage\.setItem\('radio-auth-token', "(.*?)"\)/);
        return match ? match[1] : null;
    }

    async updateCookies(response) {
        if (response.headers['set-cookie']) {
            for (const cookieStr of response.headers['set-cookie']) {
                await this.cookieJar.setCookieSync(cookieStr, response.config.url, {ignoreError: true});
            }
        }
    }

}

module.exports = LoginInfo;