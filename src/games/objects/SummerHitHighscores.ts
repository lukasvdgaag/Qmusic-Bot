export interface SummerHitHighscoreUser {
    name: string;
    score: number;
    city?: string;
}

export interface SummerHitHighscores {
    me: {
        rank: number;
        score: number;
    },
    top: SummerHitHighscoreUser[];
}