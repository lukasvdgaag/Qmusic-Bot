const Socket = require('./SocketListener');
const AuthBank = require("./auth/AuthBank");
const CatchTheSummerHit = require("./games/CatchTheSummerHit");

(async () => {
    const authBank = new AuthBank();
    await authBank.refreshTokens();

    const catchTheSummerHit = await new CatchTheSummerHit(authBank);

    const socket = new Socket(authBank, catchTheSummerHit);
})();

