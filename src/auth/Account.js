const AccountSettings = require("./AccountSettings");

class Account {

    /**
     * @type {string}
     */
    username;
    /**
     * @type {string}
     */
    password;
    /**
     * @type {string|null}
     */
    discord_id;
    /**
     * @type {number|null}
     */
    expires;
    /**
     * @type {string|null}
     */
    token;
    /**
     * @type {AccountSettings}
     */
    settings;

    constructor(jsonData) {
        this.username = jsonData.username;
        this.password = jsonData.password;
        this.discord_id = jsonData?.discord_id ?? null;
        this.expires = jsonData?.expires ?? null;
        this.token = jsonData?.token ?? null;
        this.settings = new AccountSettings(jsonData?.settings ?? {});
    }

}

module.exports = Account;