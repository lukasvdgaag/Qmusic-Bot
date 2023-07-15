const {EmbedBuilder} = require("discord.js");
const QMessagesManager = require("../QMessagesManager");

class CatchTheArtist {

    /**
     * @type {DiscordBot}
     */
    #discordBot;
    /**
     * @type {QMessagesManager}
     */
    #messagesManager;

    constructor(discordBot) {
        this.#discordBot = discordBot;
        this.#messagesManager = new QMessagesManager(discordBot);

        this.artistCatchers = new Map();

        this.#init();
    }

    #init() {
        this.initContestantsArtists();
    }

    initContestantsArtists() {
        const users = this.#discordBot.authBank.getUsers();

        for (const user of users) {
            this.initContestant(user);
        }
    }

    /**
     * @param {Account} user
     */
    initContestant(user) {
        const settings = user.settings.catch_the_artist;

        // Check if the game is enabled and if the user has an artist set
        if (!settings.enabled || !settings.artist_name) return;

        const artist = settings.artist_name.toUpperCase();
        if (!this.artistCatchers.has(artist)) {
            this.artistCatchers.set(artist, new Set());
        }

        this.artistCatchers.get(artist).add(user.username);
    }

    /**
     * @param {SongInfo} songInfo
     * @returns {Promise<void>}
     */
    async checkForCatch(songInfo) {
        if (this.#discordBot.isNightTime()) return;
        if (await this.checkForUpcoming(songInfo)) return;

        let artist = songInfo.artist;
        if (!this.artistCatchers.has(artist)) return;

        const users = this.artistCatchers.get(artist);

        const notifyUsers = new Set();
        let messageUsers = [];

        for (const username of users) {
            const user = await this.#discordBot.authBank.getUser(username);

            // Check if the user is still catching this artist
            if (!user || !user.settings.catch_the_artist.enabled || user.settings.catch_the_artist.artist_name !== artist) continue;

            // Check if the user has already been notified
            if (user.settings.catch_the_artist.notify) notifyUsers.add(`<@${user.discord_id}>`);
            if (user.settings.catch_the_artist.send_app_message) messageUsers.push(user);
        }

        if (notifyUsers.size === 0 && messageUsers.length === 0) return;

        // Send the automatic app messages
        messageUsers = await this.sendAppMessages(messageUsers, artist);

        const messageUsersPings = messageUsers.map(user => `<@${user.discord_id}>`);

        let content = `**${artist}** is playing on Qmusic!! ${Array.from(notifyUsers).join(' ')}`;
        if (messageUsersPings.length > 0) content += `\n${messageUsersPings.join(' ')} check your app, I have automatically send the messages for you!`;

        const embed = new EmbedBuilder()
            .setTitle(`${artist} is playing right now!!`)
            .setDescription(`${artist} is playing right now on Qmusic. Go send a message in the app!`)
            .setColor(process.env.MAIN_COLOR)
            .setThumbnail(`https://api.qmusic.nl${songInfo.thumbnail}`)
            .setFooter({
                text: "Q sounds better with you!",
                iconURL: "https://www.radio.net/images/broadcasts/e8/c0/114914/1/c300.png"
            })
            .addFields(
                {name: 'Song title', value: songInfo.title, inline: true},
                {name: 'Artist', value: songInfo.artist, inline: true},
            );

        if (messageUsers.length > 0) {
            const userEmails = messageUsers.map(user => `\`${user.username}\``).join(', ');
            embed.addFields({name: 'Automatic app messages', value: userEmails, inline: false});
        }

        embed.addFields({name: 'Listen live', value: 'https://qmusic.nl/luister/qmusic_nl', inline: false});

        await this.#discordBot.sendMessage({
            content: content,
            embeds: [embed]
        })
    }

    /**
     * @param {Account[]} users
     * @param {string} message
     * @returns {Promise<Account[]>}
     */
    async sendAppMessages(users, message) {
        const promises = [];

        for (const user of users) {
            promises.push(this.#messagesManager.sendMessage(user, message));
        }

        const results = await Promise.allSettled(promises);
        let caughtUsers = [];
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.status !== 'fulfilled') continue;

            if (result.value.status === 200 || result.value.status === 201) {
                caughtUsers.push(users[i]);
            }
        }
        return caughtUsers;
    }

    /**
     * @param {SongInfo} songInfo
     * @returns {Promise<boolean>}
     */
    async checkForUpcoming(songInfo) {
        // check if there is a next song
        if (!songInfo.next) return false;

        let artist = songInfo.next.artist;
        if (!this.artistCatchers.has(artist)) return false;

        const users = this.artistCatchers.get(artist);

        const notifyUsers = new Set();
        for (const username of users) {
            const user = this.#discordBot.authBank.getUser(username);
            if (!user || !user.settings.catch_the_artist.enabled || user.settings.catch_the_artist.artist_name !== artist || !user.settings.catch_the_artist.notify_when_upcoming) continue;

            if (user.discord_id) notifyUsers.add(`<@${user.discord_id}>`);
        }

        if (notifyUsers.size === 0) return false;

        const content = `**${artist}** is coming up next on Qmusic!! ${Array.from(notifyUsers).join(' ')}`;

        const embed = new EmbedBuilder()
            .setTitle(`${artist} is coming up next!`)
            .setDescription(`${artist} is coming up next on Qmusic. Get your app ready!`)
            .setColor(process.env.MAIN_COLOR)
            .setThumbnail(`https://api.qmusic.nl${songInfo.next.thumbnail}`)
            .setFooter({
                text: "Q sounds better with you!",
                iconURL: "https://www.radio.net/images/broadcasts/e8/c0/114914/1/c300.png"
            })
            .addFields(
                {name: 'Song title', value: songInfo.title, inline: true},
                {name: 'Artist', value: songInfo.artist, inline: true},
                {name: 'Up next', value: `${songInfo.next.title} - ${artist}`, inline: false},
                {name: 'Listen live', value: 'https://qmusic.nl/luister/qmusic_nl', inline: false}
            )

        await this.#discordBot.sendMessage({
            content: content,
            embeds: [embed]
        });
        return true;
    }


}

module.exports = CatchTheArtist;