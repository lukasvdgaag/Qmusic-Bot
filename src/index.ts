import path from "path";
import {AuthBank} from "./auth/AuthBank";
import {DiscordBot} from "./DiscordBot";
import {getNowDate} from "./helpers/TimeHelper";

const envLoc = __dirname.endsWith("src") ? path.resolve(__dirname, "../.env") : path.resolve(__dirname, ".env");

require('dotenv').config({path: envLoc});
(async () => {
    console.log("Current time:", getNowDate())
    console.log("Current time millis:", getNowDate().getTime());

    const authBank = new AuthBank();
    await authBank.refreshTokens();

    const discordBot = new DiscordBot(authBank);
})();

