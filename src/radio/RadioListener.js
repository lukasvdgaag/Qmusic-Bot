const axios = require("axios");
const StationInfo = require("./StationInfo");

const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus} = require('@discordjs/voice');
const {VoiceBasedChannel} = require("discord.js");

class RadioListener {

    constructor() {
        /**
         * @type {Map<string, StationInfo>}
         */
        this.stations = new Map();

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
     * @returns {Promise<void>}
     */
    async playStation(stationId, voiceChannel) {
        const station = this.stations.get(stationId);

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
        })
    }

    stop() {
        if (this.player) {
            this.activeChannel = null;
            this.player.stop(true);
            this.player = null;
            return true;
        }
        return false;
    }



}

module.exports = RadioListener;