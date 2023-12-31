const WebSocketClient = require('websocket').client;
const {EmbedBuilder} = require("discord.js");
const SongInfo = require("./radio/SongInfo");

class SocketListener {

    /**
     * @type {DiscordBot}
     */
    #discordBot;
    /**
     * A map of the station id and the song that is currently playing.
     * @type {Map<string, SongInfo>}
     */
    playingNow;

    constructor(discordBot) {
        this.#discordBot = discordBot;
        this.playingNow = new Map();
        this.messages = [
            `["{\\"action\\":\\"join\\",\\"id\\":3,\\"sub\\":{\\"station\\":\\"qmusic_nl\\",\\"entity\\":\\"plays\\",\\"action\\":\\"play\\"},\\"backlog\\":1}"]`,
            `["{\\"action\\":\\"join\\",\\"id\\":4,\\"sub\\":{\\"station\\":\\"nonstop_qnl\\",\\"entity\\":\\"plays\\",\\"action\\":\\"play\\"},\\"backlog\\":1}"]`,
            `["{\\"action\\":\\"join\\",\\"id\\":5,\\"sub\\":{\\"station\\":\\"foute_uur_nl\\",\\"entity\\":\\"plays\\",\\"action\\":\\"play\\"},\\"backlog\\":1}"]`,
            `["{\\"action\\":\\"join\\",\\"id\\":6,\\"sub\\":{\\"station\\":\\"hotnow_qnl\\",\\"entity\\":\\"plays\\",\\"action\\":\\"play\\"},\\"backlog\\":1}"]`,
            `["{\\"action\\":\\"join\\",\\"id\\":7,\\"sub\\":{\\"station\\":\\"classics_qnl\\",\\"entity\\":\\"plays\\",\\"action\\":\\"play\\"},\\"backlog\\":1}"]`,
            `["{\\"action\\":\\"join\\",\\"id\\":8,\\"sub\\":{\\"station\\":\\"nederlandstalig_qnl\\",\\"entity\\":\\"plays\\",\\"action\\":\\"play\\"},\\"backlog\\":1}"]`,
            `["{\\"action\\":\\"join\\",\\"id\\":9,\\"sub\\":{\\"station\\":\\"one_world_radio_qnl\\",\\"entity\\":\\"plays\\",\\"action\\":\\"play\\"},\\"backlog\\":1}"]`,
            `["{\\"action\\":\\"join\\",\\"id\\":10,\\"sub\\":{\\"station\\":\\"qmusic_limburg\\",\\"entity\\":\\"plays\\",\\"action\\":\\"play\\"},\\"backlog\\":1}"]`
        ]

        this.init();
    }

    init() {
        this.playingNow.clear();
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
                        const songInfo = SongInfo.fromJson(input);
                        if (!songInfo) return;

                        this.playingNow.set(songInfo.station, songInfo);

                        this.#discordBot.radioListener.changeSong(songInfo).catch(() => {});

                        if (songInfo.station === 'qmusic_nl') {
                            // Check if the song needs to be caught
                            this.#discordBot.catchTheSummerHit.checkForCatches(songInfo.title, songInfo.artist).catch(console.log);
                            this.#discordBot.catchTheArtist.checkForCatch(songInfo).catch(console.log);
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