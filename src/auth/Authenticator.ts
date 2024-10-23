import axios, {AxiosInstance, AxiosResponse} from "axios";
import {HttpCookieAgent, HttpsCookieAgent} from 'http-cookie-agent/http';
import {CookieJar} from 'tough-cookie';

/**
 * LoginInfo class to log in to the Qmusic API.
 * Mimics the login process of the Qmusic website to obtain a bearer token.
 *
 * @class Authenticator
 * @version 1.0.0
 * @since 1.1.0
 */
export class Authenticator {

    private readonly cookieJar: CookieJar;
    private readonly axiosInstance: AxiosInstance;

    constructor() {
        this.cookieJar = new CookieJar();

        const httpCookieAgent = axios.defaults.httpAgent = new HttpCookieAgent({
            cookies: {
                jar: this.cookieJar
            },
            keepAlive: true,
        });
        const httpsCookieAgent = axios.defaults.httpsAgent = new HttpsCookieAgent({
            cookies: {
                jar: this.cookieJar
            },
            keepAlive: true,
            rejectUnauthorized: false,
        });
        this.axiosInstance = axios.create({
            withCredentials: true,
            httpAgent: httpCookieAgent,
            httpsAgent: httpsCookieAgent,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Accept': '*/*'
            }
        });

        this.axiosInstance.interceptors.request.use(async (config) => {
            if (!config.url) return config;

            config.headers.Cookie = this.cookieJar.getCookieString(config.url);
            return config;
        });
    }

    /**
     * Returns the bearer token for the given credentials.
     * @param username The username of the account.
     * @param password The password of the account.
     * @returns {Promise<string|null>} Bearer token or null if the credentials are invalid.
     */
    async processLogin(username: string, password: string): Promise<string | undefined> {
        this.cookieJar.removeAllCookiesSync();

        try {
            // Request the credentials
            let response = await this.axiosInstance.get('https://myprivacy.dpgmedia.nl/consent?siteKey=ewjhEFT3YBV10QQd&callbackUrl=https%3a%2f%2fqmusic.nl%2fprivacy%2faccept%3foriginalUrl%3d%252f');
            await this.#updateCookies(response);

            let cookies = await this.cookieJar.getCookies('https://myprivacy.dpgmedia.nl/');
            const authIdCookie = cookies.filter(a => a.key === 'authId')[0].value;

            // Accept the DPG Media Cookie Policy
            response = await this.axiosInstance.get(`https://qmusic.nl/privacy/accept?originalUrl=%2F&authId=${authIdCookie}`);
            await this.#updateCookies(response);

            // Get the CSRF token
            response = await this.axiosInstance.get('https://qmusic.nl/_csrf/?origin=https%3A%2F%2Fqmusic.nl&domain=.qmusic.nl');
            await this.#updateCookies(response);

            // Retrieve the SSO session ticket
            response = await this.axiosInstance.get('https://login.dpgmedia.nl/authorize/sso?client_id=qmusicnl-web&redirect_uri=https%3A%2F%2Fqmusic.nl%2Flogin%2Fcallback&response_type=code&scope=profile+email+address+phone+openid&state=https%3A%2F%2Fqmusic.nl%2F', {
                maxRedirects: 0,
                validateStatus: (status) => status === 303
            });
            await this.#updateCookies(response);

            response = await this.axiosInstance.get(`https://login.dpgmedia.nl/identify?client_id=qmusicnl-web`);
            await this.#updateCookies(response);

            // Login to the DPG Media account
            const loginPayload = new FormData();
            loginPayload.append('username', username);
            loginPayload.append('password', password);
            const encodedEmail = this.#encodeEmail(username);
            const loginUrl = `https://login.dpgmedia.nl/login?client_id=qmusicnl-web&email=${encodedEmail}`;
            response = await this.axiosInstance.post(loginUrl, loginPayload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Referer': loginUrl,
                },
            });
            await this.#updateCookies(response);

            // Continue the login process
            response = await this.axiosInstance.get('https://login.dpgmedia.nl/authorize/continue/sso?client_id=qmusicnl-web', {
                maxRedirects: 0,
                validateStatus: (status) => status === 303
            });
            await this.#updateCookies(response);

            // request the redirect url of the previous response
            response = await this.axiosInstance.get(response.headers.location, {
                maxRedirects: 0,
                validateStatus: (status) => status === 303
            });
            await this.#updateCookies(response);

            // request the redirect url of the previous response
            response = await this.axiosInstance.get(response.headers.location, {
                maxRedirects: 0
            });
            await this.#updateCookies(response);

            return this.#extractBearerTokenFromHtml(response.data);
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }

    #encodeEmail(email: string) {
        return Buffer.from(email).toString('base64');
    }

    #extractBearerTokenFromHtml(html: string) {
        return html.match(/localStorage\.setItem\('radio-auth-token', "(.*?)"\)/)?.[1];
    }

    async #updateCookies(response: AxiosResponse) {
        if (!response.headers['set-cookie']) {
            return;
        }

        for (const cookieStr of response.headers['set-cookie']) {
            if (!response?.config?.url) continue;

            this.cookieJar.setCookieSync(
                cookieStr,
                response?.config?.url,
                {ignoreError: true}
            );
        }
    }

}
