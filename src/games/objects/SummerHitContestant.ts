import {SummerHitTrack} from "./SummerHitInfo";

export interface SummerHitContestant {
    multiplier: {
        value: number;
        expires_at: number;
    },
    score: number;
    tracks: SummerHitTrack[];
}