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
     * Get the latest messages for a given user.
     * @param {LoginInfo} loginInfo User login information to use for the request.
     * @param {number} limit The maximum amount of messages to retrieve.
     * @returns {Promise<void>}
     */
    async getLatestMessages(loginInfo, limit = 50) {
        await axios.get("https://api.qmusic.nl/2.0/messages", {
            headers: {
                'Authorization': `Bearer ${loginInfo.bearerToken}`,
            },
            params: {
                limit: limit,
            }
        })
    }

    /**
     * Send a message to the Qmusic API as a given user.
     * @param {LoginInfo} loginInfo User login information to use for the request.
     * @param {string} message The message to send.
     * @returns {Promise<axios.AxiosResponse>}
     */
    async sendMessage(loginInfo, message) {
        const formData = new FormData();
        formData.append('text', message);

        await axios.post("https://api.qmusic.nl/2.0/messages", formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${loginInfo.bearerToken}`
            }
        })
    }

}