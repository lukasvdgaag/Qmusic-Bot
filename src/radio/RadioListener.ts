import axios from "axios";
import {StationInfo} from "./StationInfo";
import {AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel} from '@discordjs/voice';
import {APIApplicationCommandOptionChoice, EmbedBuilder, Message, RestOrArray, VoiceBasedChannel} from "discord.js";
import {DiscordBot} from "../DiscordBot";
import {SongInfo} from "./SongInfo";
import {DEFAULT_EMBED_COLOR} from "../constants/constants";

export class RadioListener {

    stations: Map<string, StationInfo>;
    messageChannelId?: string;
    lastMessage?: Message;
    activeStation?: string;
    activeChannel?: string;
    player?: AudioPlayer;
    private discordBot: DiscordBot;

    constructor(discordBot: DiscordBot) {
        this.stations = new Map();
        this.discordBot = discordBot;
    }

    loadStations = async () => {
        this.stations.clear();

        try {
            const url = "https://api.qmusic.nl/2.0/channels";
            const result = await axios.get(url);

            for (const {data: {id, name, streams, logo}} of result.data.data) {
                const station: StationInfo = {
                    id,
                    name,
                    url: streams.aac[0].source,
                    icon: logo.app_logo
                };
                this.stations.set(id, station);
            }
        } catch (e) {
            console.error(e);
        }
    }

    getCommandOptions = (): RestOrArray<APIApplicationCommandOptionChoice<string>> => {
        const options: RestOrArray<APIApplicationCommandOptionChoice<string>> = [];
        for (const station of this.stations.values()) {
            options.push({
                name: station.name,
                value: station.id
            });
        }
        return options;
    }

    playStation = async (stationId: string, voiceChannel: VoiceBasedChannel, messageChannelId: string) => {
        const station = this.stations.get(stationId);
        if (!station) return;

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
                console.error(`Error: ${error.message} with resource ${(error.resource.metadata as any).title}`);
                this.player?.play(createAudioResource(station.url, {
                    inlineVolume: true,
                }));
            });

            this.player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
            });
        }

        await this.changeSong(this.discordBot.socket?.playingNow.get(stationId));
    }

    changeSong = async (songInfo?: SongInfo) => {
        if (!this.activeChannel || !songInfo || !this.messageChannelId || !this.activeStation || this.activeStation !== songInfo.station) return;

        if (this.lastMessage) {
            this.lastMessage.delete().catch(() => {
            });
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
            .setColor(DEFAULT_EMBED_COLOR)

        if (songInfo.next) {
            embed.addFields({name: 'Up next', value: `${songInfo.next.title} - ${songInfo.next.artist}`, inline: false})
        }
        if (songInfo.spotifyUrl) {
            embed.addFields({name: 'Listen on Spotify', value: 'https://qmusic.nl/luister/qmusic_nl', inline: false});
        }

        this.lastMessage = await this.discordBot.sendMessage(
            {content, embeds: [embed]},
            this.messageChannelId
        );
    }

    async stop() {
        if (!this.player) {
            return false;
        }

        this.activeChannel = undefined;
        this.player.stop(true);
        this.player = undefined;
        this.messageChannelId = undefined;
        this.activeStation = undefined;

        if (this.lastMessage) {
            this.lastMessage.delete().catch(() => {
            });
            this.lastMessage = undefined;
        }
        return true;
    }


}