import path from "path";
import jwt from "jsonwebtoken";
import {promises as fs} from "fs";
import {Account} from "./Account";
import {Authenticator} from "./Authenticator";
import {getNow} from "../helpers/TimeHelper";
import {AccountSettings} from "./AccountSettings";

export class AuthBank {

    filepath: string;
    users: Map<string, Account>;

    constructor() {
        this.filepath = path.resolve(__dirname, "../tokens.json");
        console.log(`AuthBank filepath: ${this.filepath}`);
        this.users = new Map<string, Account>();
    }

    async loadUsers() {
        // create the file if it doesn't exist
        await fs.access(this.filepath).catch(() =>
            fs.writeFile(this.filepath, '{}', 'utf8')
        );

        const data = await fs.readFile(this.filepath, 'utf8');
        const jsonUsers = JSON.parse(data);

        this.users.clear();
        Object.values(jsonUsers).forEach(account => this.loadUser(account as Account));
    }

    /**
     * Add a new user to the bot
     * @param username Username of the account
     * @param password Password of the account
     * @param discord_id Discord ID of the user
     * @param save Whether to save the changes to the file
     * @returns The created account or false if the user already exists
     */
    addUser = async (username: string, password: string, discord_id: string | undefined = undefined, save: boolean = false): Promise<Account | boolean> => {
        if (this.getUser(username)) return false;

        const userData: Account = {
            username,
            password,
            discord_id,
            settings: new AccountSettings(),
        }

        const addedUser = this.loadUser(userData);
        if (save) await this.saveUsers();
        return addedUser;
    }

    removeUser = async (username: string): Promise<boolean> => {
        if (!this.getUser(username)) return false;

        this.users.delete(username);
        await this.saveUsers();

        return true;
    }

    loadUser = (jsonUser: Account): Account => {
        this.users.set(jsonUser.username, jsonUser);
        return jsonUser;
    }

    getUser = (username: string): Account | undefined => {
        return this.users.get(username);
    }

    getUsers = (): IterableIterator<Account> => {
        return this.users.values();
    }

    /**
     * Get a user by their discord ID
     * @param {string} discordId
     * @returns {Account|null}
     */
    getUserByDiscordId = (discordId: string): Account | undefined => {
        for (const user of this.users.values()) {
            if (user.discord_id === discordId) return user;
        }
        return undefined;
    }

    saveUsers = async () => {
        const json: { [key: string]: Account } = {};

        for (const user of this.users.values()) {
            json[user.username] = user;
        }

        const data = JSON.stringify(json, null, 2);
        await fs.writeFile(this.filepath, data, 'utf8');
    }

    isTokenExpired = (token?: string) => {
        const exp = this.getTokenExpirationDate(token);

        // If there is no expiration date, the token is invalid
        if (!exp) return true;

        // Check if the token is expired or will expire in the next hour
        const currentTime = Math.floor(getNow() / 1000);
        return exp < currentTime + 3600;
    }

    refreshTokens = async () => {
        await this.loadUsers();
        for (const user of this.users.values()) {
            await this.refreshUserToken(user.username, false);
        }
        await this.saveUsers();
    }

    refreshUserToken = async (username: string, save: boolean = true, force: boolean = false) => {
        const user = this.getUser(username);
        if (!user) return;

        if (force || !user.token || this.isTokenExpired(user.token)) {
            user.token = await this.generateNewToken(user.username);
        }

        user.expires = this.getTokenExpirationDate(user.token);

        if (save) await this.saveUsers();

        const currentTime = Math.floor(getNow() / 1000);
        const timeToRefresh = Math.max(5, (user.expires ?? 0) - currentTime - 3600);
        console.log(`Next refresh for ${username} in ${timeToRefresh} seconds`);
        setTimeout(async () => {
            await this.refreshUserToken(username, true, true);
        }, timeToRefresh * 1000);
    }

    private getTokenExpirationDate = (token?: string): number | undefined => {
        if (!token) return undefined;

        const decoded = jwt.decode(token);
        // If there is no expiration date, the token is invalid
        return decoded ? (decoded as any).exp as number : undefined;
    }

    private generateNewToken = async (username: string) => {
        let user = this.getUser(username);
        if (!user) return undefined;

        return (await new Authenticator().processLogin(user.username, user.password)) ?? undefined;
    }

}
