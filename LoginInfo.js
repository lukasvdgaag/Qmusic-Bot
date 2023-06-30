const axios = require("axios");

class LoginInfo {

    constructor(accountId) {
        this.accountId = accountId;

    }

    getUserKey() {
        return {
            user: {
                accountId: this.accountId,
                loggedIn: true,
            }
        }
    }

    generateBearerToken(username, password) {
        const formData = new FormData();
        formData.append("username", username);
        formData.append("password", password);

        const loginRequest = axios.post("https://login.dpgmedia.nl/login?client_id=qmusicnl-web", formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        })
    }

}