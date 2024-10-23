import axios, {AxiosResponse} from "axios";
import {DiscordBot} from "./DiscordBot";
import {Account} from "./auth/Account";

/**
 * Messages class to send and receive messages from the Qmusic API.
 *
 * @class QMessagesManager
 * @author Lukas vd Gaag
 * @version 1.0.0
 * @since 1.1.0
 */
export class QMessagesManager {

    private discordBot: DiscordBot;

    constructor(discordBot: DiscordBot) {
        this.discordBot = discordBot;
    }

    /**
     * Get the latest messages for a given user.
     * @param username User login information to use for the request.
     * @param limit The maximum amount of messages to retrieve.
     * @returns {Promise<void>}
     */
    async getLatestMessages(username: string, limit: number = 50) {
        const user = this.discordBot.authBank.getUser(username);
        if (!user || user.token) return null;

        try {
            return await axios.get("https://api.qmusic.nl/2.0/messages", {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                },
                params: {
                    limit: limit,
                }
            })
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    /**
     * Send a message to the Qmusic API as a given user.
     * @param user User login information to use for the request.
     * @param message The message to send.
     * @returns The request's response or null if the request failed.
     */
    async sendMessage(user: Account, message: string): Promise<AxiosResponse | null> {
        if (!user || !user.token) return null;

        try {
            const formData = new FormData();
            formData.append('text', message);

            return await axios.post("https://api.qmusic.nl/2.0/messages", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${user.token}`
                }
            });
        } catch (e) {
            console.log(e);
            return null;
        }
    }

}
