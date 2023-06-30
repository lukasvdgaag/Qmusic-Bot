const WebSocketClient = require('websocket').client;
const WebhookClient = require('./WebhookClient');

class Socket {

    constructor() {
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
            embed.setTitle('Connected');
            embed.setColor(0x7ed90e);
            embed.setDescription('The connection to the Qmusic websocket has been established.');
            embed.send();

            for (const message of this.messages) {
                connection.sendUTF(message);
            }
            // connection.sendUTF(subscribeToMainChannelMessage);

            connection.on('error', (e) => {
                console.log("Connection Error: " + e.toString());
            });

            connection.on('close', () => {
                const embed = new WebhookClient();
                embed.setTitle('Connection closed');
                embed.setColor(0xeb3424);
                embed.setDescription('The connection to the Qmusic websocket has been closed. Trying to reconnect...');
                embed.send();

                this.init();
            });

            connection.on('message', (message) => {
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

                                if (data.data.next?.artist.name.includes('TAYLOR SWIFT')) {
                                    webhook.setContent('@everyone **TAYLOR SWIFT** is coming up next on Qmusic. Get your app ready!!');
                                    webhook.setTitle(`Taylor Swift is coming up next!`)
                                    webhook.setDescription(`Taylor Swift is coming up next on Qmusic. Get your app ready!!`);
                                    webhook.setColor(0x8300a5)
                                    listenLive = true;
                                } else if (artist.includes('TAYLOR SWIFT')) {
                                    webhook.setContent('@everyone **TAYLOR SWIFT** IS PLAYING RIGHT NOW!!');
                                    webhook.setTitle(`Taylor Swift is playing right now!`)
                                    webhook.setDescription(`Taylor Swift is playing right now on Qmusic. Go send the message in the app!`);
                                    webhook.setColor(0x8300a5)
                                    listenLive = true;
                                } else {
                                    webhook.setTitle(`Playing: ${title} - ${artist}`);
                                    webhook.setDescription(`Qmusic is now playing: ${title} by ${artist}`);
                                    webhook.setColor(0xeb3424)
                                    return;
                                }

                                webhook.setThumbnail(`https://cdn-radio.dpgmedia.net/site/w480/${data.data.thumbnail}`)
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
                        console.log(input)
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

module.exports = Socket;