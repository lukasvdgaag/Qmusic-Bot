const axios = require("axios");

/**
 * Messages class to send and receive messages from the Qmusic API.
 *
 * @class QMessagesManager
 * @author Lukas vd Gaag
 * @version 1.0.0
 * @since 1.1.0
 */
class QMessagesManager {

    /**
     * @type {DiscordBot}
     */
    #discordBot;

    constructor(discordBot) {
        this.#discordBot = discordBot;
    }

    /**
     * Get the latest messages for a given user.
     * @param {string} username User login information to use for the request.
     * @param {number} limit The maximum amount of messages to retrieve.
     * @returns {Promise<void>}
     */
    async getLatestMessages(username, limit = 50) {
        const user = await this.#discordBot.authBank.getUser(username);
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
     * @param {Account} user User login information to use for the request.
     * @param {string} message The message to send.
     * @returns {Promise<axios.AxiosResponse>}
     */
    async sendMessage(user, message) {
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

module.exports = QMessagesManager;