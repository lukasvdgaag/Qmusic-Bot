const axios = require("axios");
const StationInfo = require("./StationInfo");

const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus} = require('@discordjs/voice');
const {VoiceBasedChannel, EmbedBuilder} = require("discord.js");

class RadioListener {

    /**
     * @type {DiscordBot}
     */
    #discordBot;


    constructor(discordBot) {
        /**
         * @type {Map<string, StationInfo>}
         */
        this.stations = new Map();
        this.#discordBot = discordBot;

        this.messageChannelId = null;
        this.lastMessage = null;

        this.activeStation = null;
        this.activeChannel = null;
        this.player = null;
    }

    async loadStations() {
        this.stations.clear();

        try {
            const url = "https://api.qmusic.nl/2.0/channels";
            const result = await axios.get(url);

            for (const {data} of result.data.data) {
                const station = new StationInfo(
                    data.id,
                    data.name,
                    data.streams.aac[0].source,
                    data.logo.app_logo
                );
                this.stations.set(station.id, station);
            }
        } catch (e) {
            console.error(e);
        }
    }

    getCommandOptions() {
        const options = [];
        for (const station of this.stations.values()) {
            options.push({
                name: station.name,
                value: station.id
            });
        }
        return options;
    }

    /**
     *
     * @param {string} stationId
     * @param {VoiceBasedChannel} voiceChannel
     * @param {string} messageChannelId
     * @returns {Promise<void>}
     */
    async playStation(stationId, voiceChannel, messageChannelId) {
        const station = this.stations.get(stationId);

        this.activeStation = stationId;
        this.messageChannelId = messageChannelId;

        if (this.player && this.player.state.status === AudioPlayerStatus.Playing) {
            const resource = createAudioResource(station.url, {
                inlineVolume: true,
            });

            this.player.stop();
            this.player.play(resource);
        } else {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });

            const resource = createAudioResource(station.url, {
                inlineVolume: true,
            });

            this.activeChannel = voiceChannel.id;

            this.player = createAudioPlayer();
            connection.subscribe(this.player);
            this.player.play(resource);

            this.player.on('error', error => {
                console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
                this.player.play(createAudioResource(station.url, {
                    inlineVolume: true,
                }));
            });

            this.player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
            });
        }

        await this.changeSong(this.#discordBot.socket.playingNow.get(stationId));
    }

    async changeSong(songInfo) {
        console.log(this.activeChannel, songInfo, this.messageChannelId, this.activeStation);
        if (!this.activeChannel || !songInfo || !this.messageChannelId || !this.activeStation || this.activeStation !== songInfo.station) return;

        if (this.lastMessage) {
            this.lastMessage.delete().catch(() => {});
        }

        const content = `Now playing: **${songInfo.title}** by ${songInfo.artist}`;
        const embed = new EmbedBuilder()
            .setTitle(`Now playing: ${songInfo.title}`)
            .addFields(
                {name: 'Song title', value: songInfo.title, inline: true},
                {name: 'Artist', value: songInfo.artist, inline: true},
            ).setThumbnail(`https://api.qmusic.nl${songInfo.thumbnail}`)
            .setFooter({
                text: "Q sounds better with you!",
                iconURL: "https://www.radio.net/images/broadcasts/e8/c0/114914/1/c300.png"
            })
            .setColor(process.env.MAIN_COLOR)

        if (songInfo.next) {
            embed.addFields({name: 'Up next', value: `${songInfo.next.title} - ${songInfo.next.artist}`, inline: false})
        }
        if (songInfo.spotifyUrl) {
            embed.addFields({name: 'Listen on Spotify', value: 'https://qmusic.nl/luister/qmusic_nl', inline: false});
        }

        this.lastMessage = await this.#discordBot.sendMessage({content, embeds: [embed]}, this.messageChannelId);
    }

    async stop() {
        if (this.player) {
            this.activeChannel = null;
            this.player.stop(true);
            this.player = null;
            this.messageChannelId = null;
            this.activeStation = null;

            if (this.lastMessage) {
                this.lastMessage.delete().catch(() => {});
                this.lastMessage = null;
            }
            return true;
        }
        return false;
    }



}

module.exports = RadioListener;