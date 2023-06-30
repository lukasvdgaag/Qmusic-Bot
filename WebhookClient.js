const axios = require('axios');
const path = require("path");
const envLoc = path.join(__dirname, '.env');
require('dotenv').config({path: envLoc});

class WebhookClient {
    constructor(webhookURL = process.env.DISCORD_WEBHOOK_URL) {
        this.webhookURL = webhookURL;
        this.content = "";
        this.embed = {
            title: '',
            description: '',
            fields: [],
            image: {url: ''},
            thumbnail: {url: ''},
            footer: {}
        };
    }

    setTitle(title) {
        this.embed.title = title;
        return this;
    }

    setDescription(description) {
        this.embed.description = description;
        return this;
    }

    addField(name, value, inline = false) {
        this.embed.fields.push({name, value, inline});
        return this;
    }

    setImage(url) {
        this.embed.image.url = url;
        return this;
    }

    setColor(color) {
        this.embed.color = color;
        return this;
    }

    setThumbnail(url) {
        this.embed.thumbnail.url = url;
        return this;
    }

    setContent(content) {
        this.content = content;
        return this;
    }

    setFooter(text, iconUrl = '') {
        this.embed.footer = {
            text,
            icon_url: iconUrl,
        };
        return this;
    }

    send() {
        const payload = {
            embeds: [this.embed],
        };
        if (this.content && this.content?.length > 0) payload.content = this.content;

        console.log(payload)

        return axios.post(this.webhookURL, payload);
    }
}

module.exports = WebhookClient;