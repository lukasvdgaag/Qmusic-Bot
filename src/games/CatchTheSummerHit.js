const axios = require('axios');
const WebhookClient = require("../DiscordWebhookEmbed");
const SummerHitInfo = require("./SummerHitInfo");

class CatchTheSummerHit {

    constructor(authBank) {
        this.authBank = authBank;
        /**
         * @type {Map<string, SummerHitInfo>}
         */
        this.songsCatchers = new Map();

        this.trackOfTheDay = null;
        this.trackOfTheDayLastUpdated = null;

        this.init();
    }

    async init() {
        await this.loadTrackOfTheDay();
        await this.initContestantsTracks();

        // start an interval that checks if it's the next day every 5 minutes
        setInterval(async () => {
            await this.checkForNewDay();
        }, 1000 * 60 * 5);
    }

    async checkForNewDay() {
        const today = new Date();
        const oldDate = new Date(this.trackOfTheDayLastUpdated);

        if (today.getUTCFullYear() > oldDate.getUTCFullYear() ||
            today.getUTCMonth() > oldDate.getUTCMonth() ||
            today.getUTCDate() > oldDate.getUTCDate()) {
            await this.loadTrackOfTheDay();
            await this.initContestantsTracks();
        }
    }

    removeUser(username) {
        this.songsCatchers.forEach((value, key) => {
            value.removeUser(username);
        });
    }

    async loadTrackOfTheDay() {
        const {data} = await axios.get('https://api.qmusic.nl/2.4/cth/games/17/track_of_the_day');

        this.trackOfTheDay = data.track_of_the_day;
        this.trackOfTheDayLastUpdated = Date.now();

        const webhook = new WebhookClient();
        webhook.setTitle('Track of the day');
        webhook.addField('Title', data.track_of_the_day.track_title);
        webhook.addField('Artist', data.track_of_the_day.artist_name);
        webhook.addField('Points', data.track_of_the_day.points);

        webhook.send();
    }

    async initContestantsTracks() {
        let trackOfTheDayTitle = this.trackOfTheDay.track_title;
        const users = Object.keys(this.authBank.users);

        // Preparing the song catchers map
        this.songsCatchers.clear();
        this.songsCatchers.set(trackOfTheDayTitle, new SummerHitInfo(this.trackOfTheDay));

        // Add the users to the song catchers map
        for (const userInfo of users) {
            const contestantInfo = await this.getContestantInfo(userInfo.username);
            // If the user has no tracks or if they have not yet entered the game on their app, skip them.
            if (!contestantInfo) continue;

            const tracks = contestantInfo.tracks;

            this.songsCatchers.get(trackOfTheDayTitle).addUser(userInfo.username);
            for (const track of tracks) {
                if (!this.songsCatchers.has(track.track_title)) {
                    this.songsCatchers.set(track.track_title, new SummerHitInfo(track));
                }
                this.songsCatchers.get(track.track_title).addUser(userInfo.username);
            }
        }
    }

    async initContestantTracks(username) {
        const contestantInfo = await this.getContestantInfo(username);
        // If the user has no tracks or if they have not yet entered the game on their app, skip them.
        if (!contestantInfo) return;

        const tracks = contestantInfo.tracks;

        // Add the user to the global song
        let globalHit = this.songsCatchers.get(this.trackOfTheDay.track_title);
        if (!globalHit.hasUser(username)) globalHit.addUser(username);

        // Adding all the users' personal songs to the catchers map
        for (const track of tracks) {
            if (!this.songsCatchers.has(track.track_title)) {
                this.songsCatchers.set(track.track_title, new SummerHitInfo(track));
            }
            this.songsCatchers.get(track.track_title).addUser(username);
        }
    }

    async getContestantInfo(username) {
        const user = this.authBank.getUser(username);
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
        const user = this.authBank.getUser(username);
        if (!user) return;

        try {
            return axios.post('https://api.qmusic.nl/2.4/cth/games/17/catches', {track_id: trackId}, {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });
        } catch (e) {
            console.log(e);
            return undefined;
        }
    }

    async getHighscoresForUser(username, limit = 10) {
        const user = this.authBank.getUser(username);
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
            console.log(e);
            return undefined;
        }
    }

    async catchSong(songTitle, artistName) {
        if (!this.songsCatchers.has(songTitle)) {
            console.log('No one is catching this song');
            return [];
        }

        const promises = [];
        let songInfo = this.songsCatchers.get(songTitle);

        if (songInfo.artist_name !== artistName) {
            console.log('No one is catching this song');
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