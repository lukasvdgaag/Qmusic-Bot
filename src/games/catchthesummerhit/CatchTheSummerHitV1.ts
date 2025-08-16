import {DiscordBot} from "../../DiscordBot";
import {AbstractCatchTheSummerHit} from "./CatchTheSummerHit";

/**
 * ## **Catch The Summer Hit game for 2023.**
 *
 * Features
 * - The game is active all day.
 * - Players have personal daily tracks that they can catch.
 * - There is a leaderboard, and prizes are handed out based on the leaderboard.
 * - There is a shared track of the day that all players can catch.
 * @deprecated This class is deprecated and replaced by {@link CatchTheSummerHitV2} as of 2025.
 */
export class CatchTheSummerHitV1 extends AbstractCatchTheSummerHit{
    constructor(discordBot: DiscordBot) {
        super(discordBot, BASE_URL);
    }

    protected isCatchingEnabledAtThisTime(): boolean {
        return true;
    }
}

// game in 2023
const BASE_URL = 'https://api.qmusic.nl/2.4/cth/games/17';