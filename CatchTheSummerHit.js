const axios = require('axios');
const WebhookClient = require("./WebhookClient");
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
        await this.initContestantTracks();

        // start an interval that checks if it's the next day every hour
        setInterval(async () => {
            const today = new Date();
            const oldDate = new Date(this.trackOfTheDayLastUpdated);

            if (today.getUTCFullYear() > oldDate.getUTCFullYear() ||
                today.getUTCMonth() > oldDate.getUTCMonth() ||
                today.getUTCDate() > oldDate.getUTCDate()) {
                await this.loadTrackOfTheDay();
                await this.initContestantTracks();
            }
        }, 1000 * 60 * 60);
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

    async initContestantTracks() {
        let trackOfTheDayTitle = this.trackOfTheDay.track_title;
        const users = this.authBank.loginInfos.values();

        // Preparing the song catchers map
        this.songsCatchers.clear();
        this.songsCatchers.set(trackOfTheDayTitle, new SummerHitInfo(this.trackOfTheDay));

        // Add the users to the song catchers map
        for (const userInfo of users) {
            const tracks = await this.getContestantTracks(userInfo.username);

            this.songsCatchers.get(trackOfTheDayTitle).addUser(userInfo.username);
            for (const track of tracks) {
                if (!this.songsCatchers.has(track.track_title)) {
                    this.songsCatchers.set(track.track_title, new SummerHitInfo(track));
                }
                this.songsCatchers.get(track.track_title).addUser(userInfo.username);
            }
        }

        console.log(this.songsCatchers)
    }

    async getContestantTracks(username) {
        const user = this.authBank.getUser(username);
        if (!user) return [];

        try {
            const {data} = await axios.get('https://api.qmusic.nl/2.4/cth/games/17/contestant', {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });

            return data.contestant.tracks;
        } catch (e) {
            console.error(e);
        }
    }

    async catchSongForUser(username, trackId) {
        const user = this.authBank.getUser(username);
        if (!user) return;

        console.log(`Catching song ${trackId} for user ${username}`)
        return axios.post('https://api.qmusic.nl/2.4/cth/games/17/catches', {track_id: trackId}, {
            headers: {
                'Authorization': `Bearer ${user.token}`
            }
        });
    }

    async catchSong(songTitle) {
        if (!this.songsCatchers.has(songTitle)) {
            console.log('No one is catching this song');
            return [];
        }

        const promises = [];
        let songInfo = this.songsCatchers.get(songTitle);
        const songUsers = songInfo.getUsers();

        for (const username of songUsers) {
            promises.push(this.catchSongForUser(username, songInfo.track_id));
        }

        const results = await Promise.allSettled(promises);
        // check if all the axios requests have an OK status
        let catchedUsers = [];
        for (let i = 0; i<results.length; i++) {
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