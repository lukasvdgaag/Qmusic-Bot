const axios = require('axios');
const SummerHitInfo = require("./SummerHitInfo");
const {EmbedBuilder} = require("discord.js");

class CatchTheSummerHit {

    /**
     * @type {DiscordBot}
     */
    #discordBot;

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
        await this.loadTrackOfTheDay();
        await this.initContestantsTracks();

        // start an interval that checks if it's the next day every 5 minutes
        setInterval(async () => {
            await this.checkForNewDay();
        }, 1000 * 60 * 5);
    }

    async checkForNewDay() {
        const today = new Date();
        const oldDate = new Date(this.trackOfTheDayLastUpdated ?? 0);

        const trackOfTheDayWasNull = this.trackOfTheDay == null;
        const isNextDay = today.getUTCFullYear() > oldDate.getUTCFullYear() ||
            today.getUTCMonth() > oldDate.getUTCMonth() ||
            today.getUTCDate() > oldDate.getUTCDate();

        if (trackOfTheDayWasNull || isNextDay) {
            await this.loadTrackOfTheDay();
            if (isNextDay) await this.initContestantsTracks();

            // check if the track of the day was null and is now not null
            if (!isNextDay && trackOfTheDayWasNull && this.trackOfTheDay != null) {
                this.songsCatchers.set(this.trackOfTheDay.track_title, new SummerHitInfo(this.trackOfTheDay));
                // add all users to the track of the day
                for (const user of this.#discordBot.authBank.getUsers()) {
                    if (user.settings.catch_the_summer_hit.enabled) {
                        this.songsCatchers.get(this.trackOfTheDay.track_title).addUser(user.username);
                    }
                }
            }
        }
    }

    removeUser(username) {
        this.songsCatchers.forEach((value) => {
            value.removeUser(username);
        });
    }

    async loadTrackOfTheDay() {
        try {
            const response = await axios.get('https://api.qmusic.nl/2.4/cth/games/17/track_of_the_day');

            if (response.status !== 200) {
                this.trackOfTheDay = null;
                this.trackOfTheDayLastUpdated = null;
                return;
            }

            this.trackOfTheDay = response.data.track_of_the_day;
            this.trackOfTheDayLastUpdated = Date.now();

            let embed = this.#discordBot.commandHandler.getTrackOfTheDayEmbed(this.trackOfTheDay);
            await this.#discordBot.sendMessage({embeds: [embed]})
        } catch (e) {
            this.trackOfTheDay = null;
            this.trackOfTheDayLastUpdated = null;
        }
    }

    async initContestantsTracks() {
        let trackOfTheDayTitle = this.trackOfTheDay?.track_title;
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
            let globalHit = this.songsCatchers.get(this.trackOfTheDay.track_title);
            globalHit?.addUser(username);
        }

        // Adding all the users' personal songs to the catchers map
        for (const track of tracks) {
            if (!this.songsCatchers.has(track.track_title)) {
                this.songsCatchers.set(track.track_title, new SummerHitInfo(track));
            }
            this.songsCatchers.get(track.track_title).addUser(username);
        }
    }

    async getContestantInfo(username) {
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

    async getHighscoresForUser(username, limit = 10) {
        const user = this.#discordBot.authBank.getUser(username);
        if (!user) return;

        try {
            const {data} = await axios.get(`https://api.qmusic.nl/2.4/cth/games/17/highscores`, {
                params: {
                    limit
                },
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });

            return data.highscores;
        } catch (e) {
            return undefined;
        }
    }

    async checkForCatches(songTitle, artistName) {
        if (!this.songsCatchers.has(songTitle)) {
            return [];
        }

        // Check if the artist AND the song title match
        let songInfo = this.songsCatchers.get(songTitle);
        if (songInfo.artist_name !== artistName) {
            return [];
        }

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
                    resolve(await this.catchSongForUser(username, songInfo.track_id));
                }, delay);
            }));
        }

        // Wait for all promises to be resolved
        const results = await Promise.allSettled(promises);

        // check if all the axios requests have an OK status
        let catchedUsers = [];
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.status !== 'fulfilled') {
                continue;
            }

            if (result.value.status === 200 || result.value.status === 201) {
                const user = this.#discordBot.authBank.getUser(songUsers[i]);
                if (user.settings.catch_the_summer_hit.notify) {
                    catchedUsers.push(songUsers[i]);
                }
            }
        }

        await this.sendCatchResults(songInfo, catchedUsers);
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
            const discord = this.#discordBot.authBank.getUser(username)?.discord_id;
            if (discord) mentionUsers.add(`<@${discord}>`);
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
            content: `I caught a summer hit for ${Array.from(mentionUsers).join(' ')}`,
            embeds: [embed]
        })

    }

    async catchSong(songTitle, artistName) {
        if (!this.songsCatchers.has(songTitle)) {
            return [];
        }

        const promises = [];
        let songInfo = this.songsCatchers.get(songTitle);

        if (songInfo.artist_name !== artistName) {
            return [];
        }

        const songUsers = songInfo.getUsers();
        for (const username of songUsers) {
            promises.push(this.catchSongForUser(username, songInfo.track_id));
        }

        const results = await Promise.allSettled(promises);
        // check if all the axios requests have an OK status
        let catchedUsers = [];
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.status !== 'fulfilled') {
                continue;
            }

            if (result.value.status === 200 || result.value.status === 201) {
                catchedUsers.push(songUsers[i]);
            }
        }

        return catchedUsers;
    }

}

module.exports = CatchTheSummerHit;