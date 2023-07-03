const WebSocketClient = require('websocket').client;
const WebhookClient = require('./DiscordWebhookEmbed');

// const ARTIST_TO_TRACK = 'TAYLOR SWIFT';
const ARTIST_TO_TRACK = null;

class SocketListener {

    constructor(authBank, catchTheSummerHit) {
        this.authBank = authBank;
        this.catchTheSummerHit = catchTheSummerHit;
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
            const embed = new WebhookClient();
            embed.setTitle('Connected to websocket');
            embed.setColor(0x7ed90e);
            embed.setDescription(`The connection to the Qmusic websocket has been established. Monitoring the Catch The Summer Hit game for ${this.authBank.loginInfos.size} users.`);
            embed.send();

            for (const message of this.messages) {
                connection.sendUTF(message);
            }

            connection.on('error', (e) => {
                console.log("Connection Error: " + e.toString());
            });

            connection.on('close', () => {
                const embed = new WebhookClient();
                embed.setTitle('Connection to websocket closed');
                embed.setColor(0xeb3424);
                embed.setDescription('The connection to the Qmusic websocket has been closed. Trying to reconnect...');
                embed.send();

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

                                const webhook = new WebhookClient();
                                let listenLive = false;

                                setTimeout(async () => {
                                    const catchedUsers = await this.catchTheSummerHit.catchSong(title, artist);
                                    if (catchedUsers.length > 0) {
                                        let userMentionString = '';

                                        for (const username of catchedUsers) {
                                            const discord = this.authBank.getUser(username)?.discord_id;
                                            if (discord) userMentionString += `<@${discord}> `;
                                        }

                                        const embed = new WebhookClient();
                                        if (userMentionString.length > 0) embed.setContent(`${userMentionString} I caught the Summer Hit: ${title} by ${artist}`);
                                        embed.setTitle(`Catched Summer Hit`);
                                        embed.addField('Title', title, true);
                                        embed.addField('Artist', artist, true);
                                        embed.addField('Points', `+${this.catchTheSummerHit.songsCatchers.get(title).points} points`, true);
                                        embed.addField('Catched for', catchedUsers.join(', '));
                                        embed.send();
                                    }
                                }, 1000 * 10)

                                if (ARTIST_TO_TRACK && data.data.next?.artist.name.includes(ARTIST_TO_TRACK)) {
                                    webhook.setContent(`@everyone **${ARTIST_TO_TRACK}** is coming up next on Qmusic. Get your app ready!!`);
                                    webhook.setTitle(`${ARTIST_TO_TRACK} is coming up next!`)
                                    webhook.setDescription(`${ARTIST_TO_TRACK} is coming up next on Qmusic. Get your app ready!!`);
                                    webhook.setColor(0x8300a5)
                                    listenLive = true;
                                } else if (ARTIST_TO_TRACK && artist.includes(ARTIST_TO_TRACK)) {
                                    webhook.setContent(`@everyone **${ARTIST_TO_TRACK}** IS PLAYING RIGHT NOW!!`);
                                    webhook.setTitle(`${ARTIST_TO_TRACK} is playing right now!`)
                                    webhook.setDescription(`${ARTIST_TO_TRACK} is playing right now on Qmusic. Go send the message in the app!`);
                                    webhook.setColor(0x8300a5)
                                    listenLive = true;
                                } else {
                                    webhook.setTitle(`Playing: ${title} - ${artist}`);
                                    webhook.setDescription(`Qmusic is now playing: ${title} by ${artist}`);
                                    webhook.setColor(0xeb3424)
                                    return;
                                }

                                webhook.setThumbnail(`https://cdn-radio.dpgmedia.net/site/w480${data.data.thumbnail}`)
                                webhook.setFooter('Qmusic - Q sounds better with you!', 'https://www.radio.net/images/broadcasts/e8/c0/114914/1/c300.png');

                                webhook.addField('Song title', `${title}`, true);
                                webhook.addField('Artist', `${artist}`, true);
                                if (data.data?.next) webhook.addField('Up next', `${data.data.next?.title} - ${data.data.next?.artist?.name}`, false);
                                if (listenLive) webhook.addField('Listen live', 'https://qmusic.nl/luister/qmusic_nl', false)

                                webhook.send();
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