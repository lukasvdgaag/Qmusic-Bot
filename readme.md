# Qmusic Bot
![qmusic banner](/assets/qmusic-banner.jpg)

## About

This is a bot for the [Qmusic](https://qmusic.nl) radio station. It can be used get the current playing song, upcoming songs, and more.  
Qmusic occasionally hosts contests where you can win prizes by being sending a text message or clicking a button on their app.
This bot can automatically send these messages and perform these actions for you, so you don't have to.

## Installation

This bot is written in JavaScript and runs on [Node.js](https://nodejs.org/en/).
You can install Node.js [here](https://nodejs.org/en/download/).

After installing Node.js, you can install the bot by running the following command in the root directory of the bot:

```
npm install
```

## Configuration

Before you can run the bot, you need to configure it.

1. Take the provided `env.example` file and rename it to `.env`.
2. Fill in the required values such as your Discord webhook URL. You can find your Discord webhook URL by going to your
   Discord server settings, clicking on "Integrations", and then clicking on "Webhooks".
3. Create a `tokens.json` file in the root directory and enter your account details in the following format. Make sure to replace the values with your own
   account details. It is possible to add multiple accounts to the bot by adding more objects to the JSON file. Make sure to identify each account by its email address.
   The Discord ID is optional, but needed if you want to receive @pings in the Discord server when the bot does something related to you.

### tokens.json file example
```json
{
    "your.email@example.com": {
        "username": "your.email@example.com",
        "password": "yourPassword",
        "discord_id": "your_discord_account_id",
        "expires": null,
        "token": null
    }
}
```

## Running the bot

You can run the bot by running the following command in the root directory of the bot:

```
npm start
```

You can also run the bot using NodeJS directly:

```
node index.js
```

## API Reference

The bot uses the [Qmusic API](https://api.qmusic.nl) to get the current playing song, upcoming songs, and perform certain account actions.  
Below is a list of all the API endpoints that are used by the bot.

| Endpoint                             | Method | Description                                                                                                                              | Body                         |
|--------------------------------------|--------|------------------------------------------------------------------------------------------------------------------------------------------|------------------------------|
| **Messages**                         |        |                                                                                                                                          | -                            |
| `/2.0/messages`                      | GET    | Get the latest messages sent by the user. Add the `?limit=50` param to change the number of messages to retrieve. _Requires auth._       | -                            |
| `/2.0/messages`                      | POST   | Send a message to the Qmusic studio. _Requires auth._                                                                                    | `{"text": "<your message>"}` |
|                                      |        |                                                                                                                                          | -                            |
| **Catch The Summerhit**              |        |                                                                                                                                          | -                            |
| `/2.4/cth/games/17/`                 | GET    | Get the game information, such as start, end, and score reset dates.                                                                     | -                            |
| `/2.4/cth/games/17/track_of_the_day` | GET    | Get the current track of the day.                                                                                                        | -                            |
| `/2.4/cth/games/17/contestant`       | GET    | Get the additional tracks of the week for the contestant. _Requires auth._                                                               | -                            |
| `/2.4/cth/games/17/catches`          | POST   | Catch a summer hit. _Requires auth._                                                                                                     | `{"track_id": "<track id>"}` |
| `/2.4/cth/games/17/highscores`       | GET    | Get the highscores for the current week. Add the `?limit=50` param to change the number of top contestants to retrieve. _Requires auth._ | -                            |
| `/2.4/cth/games/17/code_exchanges`   | POST   | Submit a special codeword to obtain extra points. _Requires auth._                                                                       | `{"code": "<codeword>"}`     |

## Authentication Process

The bot uses the [OAuth 2.0](https://oauth.net/2/) protocol to authenticate with the Qmusic API.
A JWT token is used to authenticate with the API. This token is generated by the bot using the provided credentials.

In order for the bot to start the login process, the [DPG Media Cookie Policy](https://privacy.dpgmedia.be/nl/document/cookie-policy-b2b) must be accepted.  
Below is a complete overview of the authentication process.

| URL                                                                                                                                                                                                                   | Method | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `https://myprivacy.dpgmedia.nl/consent?siteKey=ewjhEFT3YBV10QQd&callbackUrl=https%3a%2f%2fqmusic.nl%2fprivacy%2faccept%3foriginalUrl%3d%252f`                                                                         | GET    | Request the credentials that are needed to accept the DPG Media Cookie Policy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `https://qmusic.nl/privacy/accept?originalUrl=%2F&authId={{AUTH_ID}}`                                                                                                                                                 | GET    | Accept the DPG Media Cookie Policy. The `{{AUTH_ID}}` parameter is the value of the `authId` cookie that was set in the previous request.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `https://login.dpgmedia.nl/authorize/sso?client_id=qmusicnl-web&redirect_uri=https%3A%2F%2Fqmusic.nl%2Flogin%2Fcallback&response_type=code&scope=profile+email+address+phone+openid&state=https%3A%2F%2Fqmusic.nl%2F` | GET    | Create a new SSO session. This will request the required permission scopes and the right redirect url and provide us with the needed cookies.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `https://qmusic.nl/_csrf/?origin=https%3A%2F%2Fqmusic.nl&domain=.qmusic.nl`                                                                                                                                           | GET    | Get the CSRF token that is needed to login.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `https://login.dpgmedia.nl/login?client_id=qmusicnl-web`                                                                                                                                                              | POST   | Login to the DPG Media account. Requires the credentials to be send as form data (`username` (email) and `password`) with `Content-Type` set to `multipart/form-data`. It is also recommended to use a 'general' `User-Agent` like `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36`. Lastly, the `Referer` header has to be set to `https://login.dpgmedia.nl/login?client_id=qmusicnl-web&email={{ENCODED_EMAIL}}` to mimic the behavior of the website. Here, `{{ENCODED_EMAIL}}` is the Base64-encoded email that was used for the authentication. |
| `https://login.dpgmedia.nl/authorize/continue/sso?client_id=qmusicnl-web`                                                                                                                                             | GET    | Continue the login process. This will bring us to the callback page where the `radio-auth-token` is set in the local storage. We need this token for our OAuth API verification as this is our Bearer token.                                                                                                                                                                                                                                                                                                                                                                                                           |
