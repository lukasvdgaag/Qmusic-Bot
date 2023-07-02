class SummerHitInfo {

    constructor(data) {
        this.points = data.points;
        this.track_title = data.track_title;
        this.artist_name = data.artist_name;
        this.track_id = data.track_id;
        this.track_thumbnail = data.track_thumbnail;

        this.users = [];
    }

    addUser(username) {
        this.users.push(username);
    }

    getUsers() {
        return this.users;
    }

    hasUser(username) {
        return this.users.includes(username);
    }

}

module.exports = SummerHitInfo;