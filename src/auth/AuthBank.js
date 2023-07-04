const path = require("path");
const fs = require("fs").promises;
const jwt = require("jsonwebtoken");
const LoginInfo = require("./LoginInfo");

class AuthBank {

    constructor() {
        this.filepath = path.resolve(__dirname, "../tokens.json");
        this.users = {};

        this.loginInfos = new Map();
    }

    async loadUsers() {
        const data = await fs.readFile(this.filepath, 'utf8');
        this.users = JSON.parse(data);

        for (const username in this.users) {
            this.loadUser(username);
        }
    }

    async addUser(username, password, discord_id = null, save = false) {
        if (this.users[username]) return false;

        this.users[username] = {
            username,
            password,
            discord_id,
            token: null,
            expires: null,
        }

        this.loadUser(username);
        if (save) await this.saveUsers();
        return true;
    }

    async removeUser(username) {
        if (!this.users[username]) return false;

        delete this.users[username];
        this.loginInfos.delete(username);
        await this.saveUsers();

        return true;
    }

    loadUser(username) {
        const user = this.users[username];
        if (!user) return false;

        this.loginInfos.set(username, new LoginInfo(user.username, user.password, user?.token ?? null));
        return true;
    }

    getUser(username) {
        return this.users[username];
    }

    getUserByDiscordId(discordId) {
        for (const user of Object.values(this.users)) {
            if (user.discord_id === discordId) return user;
        }
        return null;
    }

    /**
     * @param {string} username
     * @returns {LoginInfo}
     */
    getLoginInfo(username) {
        return this.loginInfos.get(username);
    }

    async saveUsers() {
        const data = JSON.stringify(this.users, null, 2);
        await fs.writeFile(this.filepath, data, 'utf8');
    }

    isTokenExpired(token) {
        const exp = this.getTokenExpirationDate(token);

        // If there is no expiration date, the token is invalid
        if (!exp) return true;

        // Check if the token is expired or will expire in the next hour
        const currentTime = Math.floor(Date.now() / 1000);
        return exp < currentTime + 3600;
    }

    getTokenExpirationDate(token) {
        const decoded = jwt.decode(token);
        const exp = decoded && decoded.exp;

        // If there is no expiration date, the token is invalid
        return exp ?? null;
    }

    async generateNewToken(username) {
        let loginInfo = this.getLoginInfo(username);
        if (!loginInfo) {
            // Try to load the user
            if (!this.loadUser(username)) return null;

            loginInfo = this.getLoginInfo(username);
        }

        return await loginInfo.processLogin();
    }

    async refreshTokens() {
        await this.loadUsers();
        for (const user of this.loginInfos.values()) {
            await this.refreshUserToken(user.username, false);
        }
        await this.saveUsers();
    }

    async refreshUserToken(username, save=true, force=false) {
        const user = this.getLoginInfo(username);
        if (user == null) return;

        if (force || !user.bearerToken || this.isTokenExpired(user.bearerToken)) {
            await this.generateNewToken(user.username);
        }

        const jsonUser = this.getUser(user.username);
        jsonUser.token = user.bearerToken;
        jsonUser.expires = this.getTokenExpirationDate(user.bearerToken);

        if (save) await this.saveUsers();

        const currentTime = Math.floor(Date.now() / 1000);
        const timeToRefresh = Math.max(0, jsonUser.expires - currentTime - 600);
        console.log(`Next refresh for ${username} in ${timeToRefresh} seconds`);
        setTimeout(async () => {
            await this.refreshUserToken(username, true, true);
        }, timeToRefresh * 1000);
    }

}

module.exports = AuthBank;