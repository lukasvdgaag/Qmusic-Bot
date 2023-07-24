const AuthBank = require("./auth/AuthBank");
const path = require("path");
const DiscordBot = require("./DiscordBot");
const {getNowDate} = require("./utils/TimeUtils");
const envLoc = path.join(__dirname, '.env');

require('dotenv').config({path: envLoc});
(async () => {
    console.log("Current time:", getNowDate())
    console.log("Current time millis:", getNowDate().getTime());

    const authBank = new AuthBank();
    await authBank.refreshTokens();

    const discordBot = new DiscordBot(authBank);
})();

