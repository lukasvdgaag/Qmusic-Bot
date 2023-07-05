const WebSocketClient = require('websocket').client;
const {EmbedBuilder} = require("discord.js");

// const ARTIST_TO_TRACK = 'TAYLOR SWIFT';
const ARTIST_TO_TRACK = null;

class SocketListener {

    /**
     * @type {DiscordBot}
     */
    #discordBot;

    constructor(discordBot) {
        this.#discordBot = discordBot;
        this.messages = [
            `["{\\"action\\":\\"join\\",\\"id\\":3,\\"sub\\":{\\"station\\":\\"qmusic_nl\\",\\"entity\\":\\"plays\\",\\"action\\":\\"play\\"},\\"backlog\\":1}"]`,
        ]

        this.init();
    }

    init() {
        this.client = new WebSocketClient();

        this.client.on('connectFailed', (e) => {
            console.log('Connect Error: ' + e.toString());
        })

        this.client.on('connect', (connection) => {
            const embed = new EmbedBuilder()
                .setTitle('Connected to websocket')
                .setColor("#7ed90e")
                .setDescription(`The connection to the Qmusic websocket has been established. Monitoring the Catch The Summer Hit game for ${this.#discordBot.authBank.users.size} users.`);

            this.#discordBot.sendMessage({embeds: [embed]}).catch(console.log);

            for (const message of this.messages) {
                connection.sendUTF(message);
            }

            connection.on('error', (e) => {
                console.log("Connection Error: " + e.toString());
            });

            connection.on('close', () => {
                const embed = new EmbedBuilder()
                    .setTitle('Connection to websocket closed')
                    .setColor("#eb3424")
                    .setDescription(`The connection to the Qmusic websocket has been closed. Trying to reconnect...`);

                this.#discordBot.sendMessage({embeds: [embed]}).catch(console.log);

                this.init();
            });

            connection.on('message', async (message) => {
                if (message.type === 'utf8') {
                    let input = message.utf8Data;

                    if (input === 'o' || input === 'h') return;

                    try {
                        input = this.escapeMessage(input);

                        const startIndex = input.indexOf('"') + 1;
                        const endIndex = input.lastIndexOf('"');

                        const json = input.substring(startIndex, endIndex);

                        let data = JSON.parse(json);
                        data = JSON.parse(data.data);

                        if (data.station === 'qmusic_nl') {
                            if (data.entity === 'plays') {
                                const title = data.data.title;
                                let artist = data.data.artist.name;

                                // Check if the song needs to be caught
                                this.#discordBot.catchTheSummerHit.checkForCatches(title, artist).catch(console.log);
                                this.#discordBot.catchTheArtist.checkForCatch(data.data).catch(console.log);
                            }
                        }
                    } catch (e) {
                        //
                        console.log(e)
                    }

                }
            });
        });

        this.client.connect('wss://socket.qmusic.nl/api/465/shxy8lro/websocket');
    }

    escapeMessage(input) {
        input = input.replace(/\\\\\\"/g, '\\\\"');
        input = input.replace(/\\"/g, '"');
        return input;
    }

}

module.exports = SocketListener;