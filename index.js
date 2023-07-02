const Socket = require('./Socket');
const AuthBank = require("./AuthBank");
const CatchTheSummerHit = require("./CatchTheSummerHit");

(async () => {
    const authBank = new AuthBank();
    await authBank.refreshTokens();

    const catchTheSummerHit = await new CatchTheSummerHit(authBank);

    const socket = new Socket(authBank, catchTheSummerHit);
})();

