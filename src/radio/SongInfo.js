class SongInfo {

    /**
     * @type {string}
     */
    station;
    /**
     * @type {string}
     */
    title;
    /**
     * @type {string}
     */
    thumbnail;
    /**
     * @type {string}
     */
    artist;
    /**
     * @type {string}
     */
    spotifyUrl;

    /**
     * @type {SongInfo|null}
     */
    next;

    constructor(station, title, thumbnail, artist, spotifyUrl, next = null) {
        this.station = station;
        this.title = title;
        this.thumbnail = thumbnail;
        this.artist = artist;
        this.spotifyUrl = spotifyUrl;
        this.next = next;
    }

    static fromJson(jsonData) {
        const input = SongInfo.#escapeMessage(jsonData);

        const startIndex = input.indexOf('"') + 1;
        const endIndex = input.lastIndexOf('"');

        const json = input.substring(startIndex, endIndex);

        let data = JSON.parse(json);
        data = JSON.parse(data.data);

        if (data.entity !== 'plays') return undefined;

        let next = null;
        if (data.data?.next != null) {
            const info = data.data.next;
            next = new SongInfo(data.station, info.title, info.thumbnail, info.artist.name, info?.spotify_url);
        }

        return new SongInfo(data.station, data.data.title, data.data.thumbnail, data.data.artist.name, data.data?.spotify_url, next);
    }

    static #escapeMessage(input) {
        input = input.replace(/\\\\\\"/g, '\\\\"');
        input = input.replace(/\\"/g, '"');
        return input;
    }

}

module.exports = SongInfo;