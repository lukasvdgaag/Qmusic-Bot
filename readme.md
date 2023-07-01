# Qmusic Bot
*Q sounds better with you*

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

1. Take the provided `env.example` file and renaming it to `.env`. 
2. Fill in the required values such as your Discord webhook URL and your Qmusic account credentials. You can find your Discord webhook URL by going to your Discord server settings, clicking on "Integrations", and then clicking on "Webhooks".

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

| Endpoint                             | Method | Description                                                                                                                        | Body                         |
|--------------------------------------|--------|------------------------------------------------------------------------------------------------------------------------------------|------------------------------|
| **Messages**                         |        |                                                                                                                                    | -                            |
| `/2.0/messages`                      | GET    | Get the latest messages sent by the user. Add the `?limit=50` param to change the number of messages to retrieve. _Requires auth._ | -                            |
| `/2.0/messages`                      | POST   | Send a message to the Qmusic studio. _Requires auth._                                                                              | `{"text": "<your message>"}` |
|                                      |        |                                                                                                                                    | -                            |
| **Catch The Summerhit**              |        |                                                                                                                                    | -                            |
| `/2.4/cth/games/17/track_of_the_day` | GET    | Get the current track of the day.                                                                                                  | -                            |
| `/2.4/cth/games/17/contestant`       | GET    | Get the additional tracks of the week for the contestant. _Requires auth._                                                         | -                            |
| `/2.4/cth/games/17/catches`          | POST   | Catch a summer hit. _Requires auth._                                                                                               | `{"track_id": "<track id>"}` |


