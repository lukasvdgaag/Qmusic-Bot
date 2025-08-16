import {DiscordBot} from "../../DiscordBot";
import {AbstractCatchTheSummerHit} from "./CatchTheSummerHit";
import {getNowDate} from "../../helpers/TimeHelper";

/**
 * ## **Catch The Summer Hit game for 2025.**
 *
 * **V2** introduces new game rules:
 * - The game is only active between 06:45 and 23:59.
 * - Players no longer have personal daily tracks and can only catch the track of the day.
 * - There is no more leaderboard and prizes are handed out randomly each day.
 */
export class CatchTheSummerHitV2 extends AbstractCatchTheSummerHit{
    constructor(discordBot: DiscordBot) {
        super(discordBot, BASE_URL);
    }

    protected isCatchingEnabledAtThisTime(): boolean {
        const date: Date = getNowDate();

        // check if the current time is between 06:45 and 23:59
        return date.getHours() >= 6 && date.getHours() < 24 ||
            (date.getHours() === 23 && date.getMinutes() === 59);
    }

    // TODO: Check if track of the day endpoint is still correct
}

// game in 2025
const BASE_URL = 'https://api.qmusic.nl/2.4/cth/games/38';