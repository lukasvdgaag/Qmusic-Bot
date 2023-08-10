const axios = require('axios');
const SummerHitInfo = require("./SummerHitInfo");
const {EmbedBuilder} = require("discord.js");
const {getNowDate, getNow} = require("../utils/TimeUtils");

class CatchTheSummerHit {

    /**
     * @type {DiscordBot}
     */
    #discordBot;

    /**
     * @type {boolean}
     */
    available;

    constructor(discordBot) {
        this.#discordBot = discordBot;
        /**
         * @type {Map<string, SummerHitInfo>}
         */
        this.songsCatchers = new Map();

        this.trackOfTheDay = null;
        this.trackOfTheDayLastUpdated = null;

        this.#init().catch(console.error);
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
            const response = await axios.get('https://api.qmusic.nl/2.4/cth/games/17');

            if (response.status !== 200) return false;

            // check if json body contains "game" and if game.currentState === 'ended' or the game.endDate is in the past
            return response.data?.game?.currentState !== 'ended' && new Date(response.data?.game?.endsAt) > Date.now();
        } catch (e) {
            return false;
        }
    }

    async checkForNewDay(force = false) {
        if (!this.available) {
            const lastUpdated = this.trackOfTheDayLastUpdated;
            const isNextDay = this.#isNextDay(lastUpdated ? new Date(lastUpdated) : null);

            if (isNextDay) {
                this.available = await this.#isGameAvailable();
                force = this.available;
                if (!this.available) return;
            } else {
                return;
            }
        }

        const trackOfTheDayWasNull = this.trackOfTheDay == null;
        const isNextDay = this.#isNextDay(this.trackOfTheDay ? new Date(this.trackOfTheDay?.date) : null);

        if (force || trackOfTheDayWasNull || isNextDay) {
            await this.loadTrackOfTheDay();
            await this.initContestantsTracks();
        }
    }

    #isNextDay(date) {
        if (!date) return true;
        const today = getNowDate();

        return today.getFullYear() !== date.getFullYear() ||
        today.getMonth() !== date.getMonth() ||
        today.getDate() !== date.getDate();
    }

    removeUser(username) {
        this.songsCatchers.forEach((value) => {
            value.removeUser(username);
        });
    }

    async loadTrackOfTheDay() {
        if (!this.available) return;

        try {
            const response = await axios.get('https://api.qmusic.nl/2.4/cth/games/17/track_of_the_day');

            if (response.status !== 200) {
                this.trackOfTheDay = null;
                this.trackOfTheDayLastUpdated = null;
                return;
            }

            this.trackOfTheDay = response.data.track_of_the_day;
            this.trackOfTheDayLastUpdated = getNow();
            if (this.trackOfTheDay) this.trackOfTheDay.date = getNow();

            let embed = this.#discordBot.commandHandler.getTrackOfTheDayEmbed(this.trackOfTheDay);
            await this.#discordBot.sendMessage({embeds: [embed]})
        } catch (e) {
            this.trackOfTheDay = null;
            this.trackOfTheDayLastUpdated = null;
        }
    }

    async initContestantsTracks() {
        if (!this.available) return;

        let trackOfTheDayTitle = this.trackOfTheDay?.track_title.toUpperCase();
        const users = this.#discordBot.authBank.getUsers();

        // Preparing the song catchers map
        this.songsCatchers.clear();
        if (trackOfTheDayTitle) this.songsCatchers.set(trackOfTheDayTitle, new SummerHitInfo(this.trackOfTheDay));

        // Add the users to the song catchers map
        for (const account of users) {
            await this.initContestantTracks(account.username);
        }
    }

    async initContestantTracks(username) {
        if (!this.available) return;

        const account = this.#discordBot.authBank.getUser(username);
        // If the user has not enabled the game, skip them.
        if (!account.settings.catch_the_summer_hit.enabled) return;

        const contestantInfo = await this.getContestantInfo(username);
        // If the user has no tracks or if they have not yet entered the game on their app, skip them.
        if (!contestantInfo) return;

        const tracks = contestantInfo.tracks;

        // removing the user from all the songs
        this.removeUser(username);

        // Add the user to the global song
        if (this.trackOfTheDay) {
            let globalHit = this.songsCatchers.get(this.trackOfTheDay.track_title.toUpperCase());
            globalHit?.addUser(username);
        }

        // Adding all the users' personal songs to the catchers map
        for (const track of tracks) {
            if (!this.songsCatchers.has(track.track_title.toUpperCase())) {
                this.songsCatchers.set(track.track_title.toUpperCase(), new SummerHitInfo(track));
            }
            this.songsCatchers.get(track.track_title.toUpperCase()).addUser(username);
        }
    }

    async getContestantInfo(username) {
        if (!this.available) return undefined;

        const user = this.#discordBot.authBank.getUser(username);
        if (!user) return undefined;

        try {
            const {data} = await axios.get('https://api.qmusic.nl/2.4/cth/games/17/contestant', {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });

            return data.contestant;
        } catch (e) {
            return undefined;
        }
    }

    async catchSongForUser(username, trackId) {
        if (!this.available) return undefined;

        const user = this.#discordBot.authBank.getUser(username);
        if (!user) return;

        try {
            return axios.post('https://api.qmusic.nl/2.4/cth/games/17/catches', {track_id: trackId}, {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });
        } catch (e) {
            return undefined;
        }
    }

    async getHighscoresForUser(username, limit = 10, returnRaw = false) {
        if (!this.available) return undefined;

        const user = this.#discordBot.authBank.getUser(username);
        if (!user) return undefined;

        try {
            const response = axios.get(`https://api.qmusic.nl/2.4/cth/games/17/highscores`, {
                params: {
                    limit
                },
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });
            if (returnRaw) return response;

            const {data} = await response;
            return data.highscores;
        } catch (e) {
            return undefined;
        }
    }

    async checkForCatches(songTitle, artistName) {
        if (!this.available) return;

        if (!this.songsCatchers.has(songTitle.toUpperCase())) {
            return [];
        }

        // Check if the artist AND the song title match
        let songInfo = this.songsCatchers.get(songTitle.toUpperCase());
        // if (!songInfo.artist_name.includes(artistName) && !artistName.includes(songInfo.artist_name)) {
        //     return [];
        // }

        const songUsers = songInfo.getUsers();
        const promises = []

        const isNight = this.#discordBot.isNightTime();

        // catch the song for every user in the songUsers list
        // but randomly over a course of 5 - 15 seconds after the song has been played
        for (const username of songUsers) {
            const user = this.#discordBot.authBank.getUser(username);
            // If the user has not enabled the game or if they disabled it during night time, skip them.
            if (!user.settings.catch_the_summer_hit.enabled) continue;
            if (!user.settings.catch_the_summer_hit.catch_at_night && isNight) continue;

            const delay = Math.random() * 1000 * 10 + 5000;
            promises.push(new Promise((resolve) => {
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
    async sendCatchResults(songInfo, users) {
        // check if anyone wants to be notified.
        if (users.length === 0) return;

        const mentionUsers = new Set();
        for (const username of users) {
            let user = this.#discordBot.authBank.getUser(username);

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
            .setColor(process.env.MAIN_COLOR)
            .setFooter({
                text: 'Summer Hit Catcher for Qmusic',
            })

        await this.#discordBot.sendMessage({
            content: mentionUsers.size === 0 ? 'I caught a summer hit!' : `I caught a summer hit for ${Array.from(mentionUsers).join(' ')}`,
            embeds: [embed]
        })

    }

}

module.exports = CatchTheSummerHit;