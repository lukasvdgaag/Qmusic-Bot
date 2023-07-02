const path = require("path");
const fs = require("fs").promises;
const jwt = require("jsonwebtoken");
const LoginInfo = require("./LoginInfo");

class AuthBank {

    constructor() {
        this.filepath = path.resolve(__dirname, "./tokens.json");
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

    loadUser(username) {
        const user = this.users[username];
        if (!user) return;

        this.loginInfos.set(username, new LoginInfo(user.username, user.password, user.token));
    }

    getUser(username) {
        return this.users[username];
    }

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

        // Check if the token is expired
        const currentTime = Math.floor(Date.now() / 1000);
        return exp < currentTime;
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
            if (!(username in this.users)) {
                delete this.users[username];
                return;
            }

            this.loadUser(username);
            loginInfo = this.getLoginInfo(username);
        }

        return await loginInfo.processLogin();
    }

    async refreshTokens() {
        await this.loadUsers();
        for (const user of this.loginInfos.values()) {
            const jsonUser = this.users[user.username];

            if (!user.bearerToken || this.isTokenExpired(user.bearerToken)) {
                await this.generateNewToken(user.username);

                jsonUser.token = user.bearerToken;
                jsonUser.expires = this.getTokenExpirationDate(user.bearerToken);
            }

            // set a timeout to refresh the token 10 minute before it expires
            const currentTime = Math.floor(Date.now() / 1000);
            const timeToRefresh = jsonUser.expires - currentTime - 600;
            setTimeout(async () => {
                await this.generateNewToken(user.username);

                const jsonUser = this.getUser(user.username);
                jsonUser.token = user.bearerToken;
                jsonUser.expires = this.getTokenExpirationDate(user.bearerToken);

                await this.saveUsers();
            }, timeToRefresh * 1000);
        }
        await this.saveUsers();
    }

}

module.exports = AuthBank;