const axios = require("axios");

/**
 * Messages class to send and receive messages from the Qmusic API.
 *
 * @class Messages
 * @param {LoginInfo} loginInfo - The login information to use for the API
 * @author Lukas vd Gaag
 * @version 1.0.0
 * @since 1.1.0
 */
class Messages {

    constructor(loginInfo) {
        this.bearerToken = loginInfo.bearerToken;
    }

    async getLatestMessages(limit = 50) {
        await axios.get("https://api.qmusic.nl/2.0/messages", {
            headers: {
                'Authorization': `Bearer ${this.bearerToken}`,
            },
            params: {
                limit: limit,
            }
        })
    }

    async sendMessage(message) {
        const formData = new FormData();
        formData.append('text', message);

        await axios.post("https://api.qmusic.nl/2.0/messages", formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${this.bearerToken}`
            }
        })
    }

}