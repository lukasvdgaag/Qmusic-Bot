export interface SummerHitTrack {
    points: number;
    track_title: string;
    artist_name: string;
    track_id: string;
    track_thumbnail: string;
    users: string[];
    date?: number;
}

export class SummerHitInfo implements SummerHitTrack {
    points!: number;
    track_title!: string;
    artist_name!: string;
    track_id!: string;
    track_thumbnail!: string;
    users: string[] = [];
    date?: number;

    constructor(data: SummerHitTrack) {
        Object.assign(this, data);
    }

    addUser(username: string) {
        if (!this.users.includes(username)) this.users.push(username);
    }

    removeUser(username: string) {
        this.users = this.users.filter(user => user !== username);
    }

    getUsers(): string[] {
        return this.users;
    }

    hasUser(username: string): boolean {
        return this.users.includes(username);
    }

}
