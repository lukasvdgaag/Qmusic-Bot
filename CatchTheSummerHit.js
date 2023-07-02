const axios = require('axios');
const WebhookClient = require("./WebhookClient");

class CatchTheSummerHit {

    constructor(authBank) {
        this.authBank = authBank;
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
        let trackOfTheDayId = this.trackOfTheDay.track_id;
        const users = this.authBank.loginInfos.values();

        // Preparing the song catchers map
        this.songsCatchers.clear();
        this.songsCatchers.set(trackOfTheDayId, []);

        // Add the users to the song catchers map
        for (const userInfo of users) {
            const tracks = await this.getContestantTracks(userInfo.username);

            this.songsCatchers.get(trackOfTheDayId).push(userInfo.username);
            for (const track of tracks) {
                if (!this.songsCatchers.has(track.track_id)) {
                    this.songsCatchers.set(track.track_id, []);
                }
                this.songsCatchers.get(track.track_id).push(userInfo.username);
            }
        }
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

        const lol = await axios.post('https://api.qmusic.nl/2.4/cth/games/17/catches', {track_id: trackId}, {
            headers: {
                'Authorization': `Bearer ${user.token}`
            }
        });
    }

    async catchSong(trackId) {
        if (!this.songsCatchers.has(trackId)) return [];

        const promises = [];
        let songUsers = this.songsCatchers.get(trackId);
        for (const username of songUsers) {
            promises.push(this.catchSongForUser(username, trackId));
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