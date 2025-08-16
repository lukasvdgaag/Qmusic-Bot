import axios, {AxiosResponse} from 'axios';
import {SummerHitInfo} from "./objects/SummerHitInfo";
import {EmbedBuilder} from "discord.js";
import {getNow, isNextDay} from "../helpers/TimeHelper";
import {DiscordBot} from "../DiscordBot";
import {SummerHitHighscores} from "./objects/SummerHitHighscores";
import {SummerHitContestant} from "./objects/SummerHitContestant";
import {DEFAULT_EMBED_COLOR} from "../constants/constants";

export class CatchTheSummerHit {

    available: boolean = false;
    songCatchers: Map<string, SummerHitInfo> = new Map();
    trackOfTheDay?: SummerHitInfo;
    trackOfTheDayLastUpdated?: number;

    private discordBot: DiscordBot;

    constructor(discordBot: DiscordBot) {
        this.discordBot = discordBot;

        this.#init().catch(console.error);
    }

    checkForNewDay = async (force = false) => {
        if (!this.available) {
            const lastUpdated = this.trackOfTheDayLastUpdated;
            const nextDay = isNextDay(lastUpdated ? new Date(lastUpdated) : undefined);

            if (nextDay) {
                this.available = await this.#isGameAvailable();
                force = this.available;
                if (!this.available) return;
            } else {
                return;
            }
        }

        const trackOfTheDayWasNull = this.trackOfTheDay == null;
        const nextDate = isNextDay(this.trackOfTheDay?.date ? new Date(this.trackOfTheDay?.date) : undefined);

        if (force || trackOfTheDayWasNull || nextDate) {
            await this.loadTrackOfTheDay();
            await this.initContestantsTracks();
        }
    }

    removeUser(username: string) {
        this.songCatchers.forEach((value) => {
            value.removeUser(username);
        });
    }

    async loadTrackOfTheDay() {
        if (!this.available) return;

        try {
            const response = await axios.get(`${BASE_URL}/track_of_the_day`);

            if (response.status !== 200) {
                this.trackOfTheDay = undefined;
                this.trackOfTheDayLastUpdated = undefined;
                return;
            }

            this.trackOfTheDay = response.data.track_of_the_day;
            this.trackOfTheDayLastUpdated = getNow();
            if (this.trackOfTheDay) this.trackOfTheDay.date = getNow();

            let embed = this.discordBot.commandHandler!.getTrackOfTheDayEmbed(this.trackOfTheDay);
            await this.discordBot.sendMessage({embeds: [embed]});
        } catch (e) {
            this.trackOfTheDay = undefined;
            this.trackOfTheDayLastUpdated = undefined;
        }
    }

    async initContestantsTracks() {
        if (!this.available) return;

        let trackOfTheDayTitle = this.trackOfTheDay?.track_title.toUpperCase();
        const users = this.discordBot.authBank.getUsers();

        // Preparing the song catchers map
        this.songCatchers.clear();
        if (trackOfTheDayTitle && this.trackOfTheDay) this.songCatchers.set(trackOfTheDayTitle, this.trackOfTheDay);

        // Add the users to the song catchers map
        for (const account of users) {
            await this.initContestantTracks(account.username);
        }
    }

    async initContestantTracks(username: string) {
        if (!this.available) return;

        const account = this.discordBot.authBank.getUser(username);
        // If the user has not enabled the game, skip them.
        if (!account?.settings.catch_the_summer_hit.enabled) return;

        const contestantInfo = await this.getContestantInfo(username);
        // If the user has no tracks or if they have not yet entered the game on their app, skip them.
        if (!contestantInfo) return;

        const tracks = contestantInfo.tracks;

        // removing the user from all the songs
        this.removeUser(username);

        // Add the user to the global song
        if (this.trackOfTheDay) {
            let globalHit = this.songCatchers.get(this.trackOfTheDay.track_title.toUpperCase());
            globalHit?.addUser(username);
        }

        // Adding all the users' personal songs to the catchers map
        for (const track of tracks) {
            if (!this.songCatchers.has(track.track_title.toUpperCase())) {
                this.songCatchers.set(track.track_title.toUpperCase(), new SummerHitInfo(track));
            }
            this.songCatchers.get(track.track_title.toUpperCase())?.addUser(username);
        }
    }

    async getContestantInfo(username: string): Promise<SummerHitContestant | undefined> {
        if (!this.available) return undefined;

        const user = this.discordBot.authBank.getUser(username);
        if (!user) return undefined;

        try {
            const {data} = await axios.get(`${BASE_URL}/contestant`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });

            return data.contestant as SummerHitContestant;
        } catch (e) {
            return undefined;
        }
    }

    async catchSongForUser(username: string, trackId: string) {
        if (!this.available) return undefined;

        const user = this.discordBot.authBank.getUser(username);
        if (!user) return;

        try {
            return axios.post(`${BASE_URL}/catches`, {track_id: trackId}, {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });
        } catch (e) {
            return undefined;
        }
    }

    async getHighscoresForUser(username: string, limit: number): Promise<SummerHitHighscores | undefined>;

    async getHighscoresForUser(username: string, limit: number, returnRaw: true): Promise<AxiosResponse<{ highscores: SummerHitHighscores }> | undefined>;

    async getHighscoresForUser(username: string, limit: number, returnRaw: boolean = false): Promise<SummerHitHighscores | AxiosResponse<{
        highscores: SummerHitHighscores
    }> | undefined> {
        if (!this.available) return undefined;

        const user = this.discordBot.authBank.getUser(username);
        if (!user) return undefined;

        try {
            const response = await axios.get(`${BASE_URL}/highscores`, {
                params: {
                    limit
                },
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });

            if (returnRaw) return response;

            const {data} = response;
            return data.highscores as SummerHitHighscores;
        } catch (e) {
            return undefined;
        }
    }

    async checkForCatches(songTitle: string, artistName: string) {
        if (!this.available) return;

        if (!this.songCatchers.has(songTitle.toUpperCase())) {
            return [];
        }

        // Check if the artist AND the song title match
        let songInfo = this.songCatchers.get(songTitle.toUpperCase());
        if (!songInfo) return [];
        // if (!songInfo.artist_name.includes(artistName) && !artistName.includes(songInfo.artist_name)) {
        //     return [];
        // }

        const songUsers = songInfo.getUsers();
        const promises = []

        const isNight = this.discordBot.isNightTime();

        // catch the song for every user in the songUsers list
        // but randomly over a course of 5 - 15 seconds after the song has been played
        for (const username of songUsers) {
            const user = this.discordBot.authBank.getUser(username);

            // If the user has not enabled the game or if they disabled it during night time, skip them.
            if (!user) continue;
            if (!user.settings.catch_the_summer_hit.enabled) continue;
            if (!user.settings.catch_the_summer_hit.catch_at_night && isNight) continue;

            const delay = Math.random() * 1000 * 10 + 5000;
            promises.push(new Promise<AxiosResponse | undefined>((resolve) => {
                setTimeout(async () => {
                    try {
                        const res = await this.catchSongForUser(username, songInfo.track_id);
                        resolve(res);
                    } catch (e) {
                        resolve(undefined);
                    }
                }, delay);
            }));
        }

        // Wait for all promises to be resolved
        const results = await Promise.allSettled(promises);

        // check if all the axios requests have an OK status
        let caughtUsers = [];
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.status !== 'fulfilled' || !result.value) {
                continue;
            }

            if (result.value.status === 200 || result.value.status === 201) {
                caughtUsers.push(songUsers[i]);
            }
        }

        await this.sendCatchResults(songInfo, caughtUsers);
    }

    /**
     * Sends the catch results to the discord channel
     * @param {SummerHitInfo} songInfo
     * @param {string[]} users
     * @returns {Promise<void>}
     */
    async sendCatchResults(songInfo: SummerHitInfo, users: string[]): Promise<void> {
        // check if anyone wants to be notified.
        if (users.length === 0) return;

        const mentionUsers = new Set();
        for (const username of users) {
            let user = this.discordBot.authBank.getUser(username);

            if (user && user.settings.catch_the_summer_hit.notify) {
                const discord = user?.discord_id;
                if (discord) mentionUsers.add(`<@${discord}>`);
            }
        }

        const embed = new EmbedBuilder()
            .setTitle("⭐ Caught Summer Hit ⭐")
            .addFields(
                {name: 'Title', value: songInfo.track_title, inline: true},
                {name: 'Artist', value: songInfo.artist_name, inline: true},
                {name: 'Points', value: `+${songInfo.points} points`, inline: true},
                {name: 'Caught for', value: users.join(', ')}
            )
            .setThumbnail(`https://cdn-radio.dpgmedia.net/site/w480${songInfo.track_thumbnail}`)
            .setColor(DEFAULT_EMBED_COLOR)
            .setFooter({
                text: 'Summer Hit Catcher for Qmusic',
            })

        await this.discordBot.sendMessage({
            content: mentionUsers.size === 0 ? 'I caught a summer hit!' : `I caught a summer hit for ${Array.from(mentionUsers).join(' ')}`,
            embeds: [embed]
        })

    }

    async #init() {
        // checking game availability
        this.available = await this.#isGameAvailable();
        if (!this.available) this.trackOfTheDayLastUpdated = Date.now();

        await this.loadTrackOfTheDay();
        await this.initContestantsTracks();

        // start an interval that checks if it's the next day every 5 minutes
        setInterval(async () => {
            await this.checkForNewDay();
        }, 1000 * 60 * 5);
    }

    async #isGameAvailable() {
        try {
            const response = await axios.get(BASE_URL);

            if (response.status !== 200) return false;

            // check if json body contains "game" and if game.currentState === 'ended' or the game.endDate is in the past
            return response.data?.game?.currentState !== 'ended' && new Date(response.data?.game?.endsAt).getTime() > Date.now();
        } catch (e) {
            return false;
        }
    }

}

// game in 2023
// const BASE_URL = 'https://api.qmusic.nl/2.4/cth/games/17';

// game in 2025
const BASE_URL = 'https://api.qmusic.nl/2.4/cth/games/38';