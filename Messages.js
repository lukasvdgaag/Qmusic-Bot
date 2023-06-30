const axios = require("axios");

class Messages {

    constructor(bearerToken) {
        this.bearerToken = bearerToken;
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