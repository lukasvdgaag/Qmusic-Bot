const axios = require("axios");

class LoginInfo {

    constructor(username, password) {
        this.username = username;
        this.password = password;
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