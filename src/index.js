const Socket = require('./SocketListener');
const AuthBank = require("./auth/AuthBank");
const CatchTheSummerHit = require("./games/CatchTheSummerHit");
const path = require("path");
const DiscordBot = require("./DiscordBot");
const envLoc = path.join(__dirname, '.env');
require('dotenv').config({path: envLoc});

(async () => {
    const authBank = new AuthBank();
    await authBank.refreshTokens();


    const discordBot = new DiscordBot(authBank);
    const socket = new Socket(authBank, discordBot);
})();

