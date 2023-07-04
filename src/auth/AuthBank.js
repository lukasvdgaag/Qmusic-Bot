const path = require("path");
const fs = require("fs").promises;
const jwt = require("jsonwebtoken");
const Account = require("./Account");
const Authenticator = require("./Authenticator");

class AuthBank {

    constructor() {
        this.filepath = path.resolve(__dirname, "../tokens.json");
        /**
         * @type {Map<string, Account>}
         */
        this.users = new Map();
    }

    async loadUsers() {
        const data = await fs.readFile(this.filepath, 'utf8');
        const jsonUsers = JSON.parse(data);

        this.users.clear();

        for (const user of Object.values(jsonUsers)) {
            this.loadUser(user);
        }
    }

    /**
     * Add a new user to the bot
     * @param username Username of the account
     * @param password Password of the account
     * @param discord_id Discord ID of the user
     * @param save Whether to save the changes to the file
     * @returns {Promise<Account|boolean>} The created account or false if the user already exists
     */
    async addUser(username, password, discord_id = null, save = false) {
        if (this.getUser(username)) return false;

        const userData = {
            username,
            password,
            discord_id,
        }

        const addedUser = this.loadUser(userData);
        if (save) await this.saveUsers();
        return addedUser;
    }

    async removeUser(username) {
        if (!this.getUser(username)) return false;

        this.users.delete(username);
        await this.saveUsers();

        return true;
    }

    /**
     * @param jsonUser
     * @returns {Account}
     */
    loadUser(jsonUser) {
        let account = new Account(jsonUser);
        this.users.set(jsonUser.username, account);
        return account;
    }

    /**
     * @param username
     * @returns {Account}
     */
    getUser(username) {
        return this.users.get(username);
    }

    /**
     * Get all users
     * @returns {IterableIterator<Account>}
     */
    getUsers() {
        return this.users.values();
    }

    getUserByDiscordId(discordId) {
        for (const user of this.users.values()) {
            if (user.discord_id === discordId) return user;
        }
        return null;
    }

    async saveUsers() {
        const json = {};

        for (const user of this.users.values()) {
            json[user.username] = user;
        }

        const data = JSON.stringify(json, null, 2);
        await fs.writeFile(this.filepath, data, 'utf8');
    }

    isTokenExpired(token) {
        const exp = this.#getTokenExpirationDate(token);

        // If there is no expiration date, the token is invalid
        if (!exp) return true;

        // Check if the token is expired or will expire in the next hour
        const currentTime = Math.floor(Date.now() / 1000);
        return exp < currentTime + 3600;
    }

    #getTokenExpirationDate(token) {
        const decoded = jwt.decode(token);
        const exp = decoded && decoded.exp;

        // If there is no expiration date, the token is invalid
        return exp ?? null;
    }

    async #generateNewToken(username) {
        let user = this.getUser(username);
        if (!user) return null;

        return await new Authenticator().processLogin(user.username, user.password);
    }

    async refreshTokens() {
        await this.loadUsers();
        for (const user of this.users.values()) {
            await this.refreshUserToken(user.username, false);
        }
        await this.saveUsers();
    }

    async refreshUserToken(username, save = true, force = false) {
        const user = this.getUser(username);
        if (user == null) return;

        if (force || !user.token || this.isTokenExpired(user.token)) {
            user.token = await this.#generateNewToken(user.username);
        }

        user.expires = this.#getTokenExpirationDate(user.token);

        if (save) await this.saveUsers();

        const currentTime = Math.floor(Date.now() / 1000);
        const timeToRefresh = Math.max(0, user.expires - currentTime - 600);
        console.log(`Next refresh for ${username} in ${timeToRefresh} seconds`);
        setTimeout(async () => {
            await this.refreshUserToken(username, true, true);
        }, timeToRefresh * 1000);
    }

}

module.exports = AuthBank;