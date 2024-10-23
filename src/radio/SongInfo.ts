export interface SongInfo {
    station: string;
    title: string;
    thumbnail: string;
    artist: string;
    spotifyUrl: string;
    next?: SongInfo;
}

const escapeMessage = (input: string) => {
    input = input.replace(/\\\\\\"/g, '\\\\"');
    input = input.replace(/\\"/g, '"');
    return input;
}

const extractSongInfo = (data: any): SongInfo => {
    const {title, thumbnail, artist: {name: artist}, spotify_url: spotifyUrl} = data;
    return {
        station: data.station,
        title,
        thumbnail,
        artist,
        spotifyUrl
    };
}

export const getSongInfoFromJson = (jsonData: string): SongInfo | undefined => {
    const input = escapeMessage(jsonData);

    const startIndex = input.indexOf('"') + 1;
    const endIndex = input.lastIndexOf('"');

    const json = input.substring(startIndex, endIndex);

    let data = JSON.parse(json);
    data = JSON.parse(data.data);

    if (data.entity !== 'plays') return undefined;

    return {
        ...extractSongInfo(data.data),
        next: data.data?.next ? extractSongInfo(data.data.next) : undefined
    };
}
