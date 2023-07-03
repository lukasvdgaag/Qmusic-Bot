const {EmbedBuilder} = require("discord.js");

class CommandHandler {

    /**
     *
     * @param {AuthBank} authBank
     * @param {CatchTheSummerHit} catchTheSummerHit
     */
    constructor(authBank, catchTheSummerHit) {
        this.authBank = authBank;
        this.catchTheSummerHit = catchTheSummerHit;
    }

    async handleSummerHitAboutCommand(interaction) {
        const embed = new EmbedBuilder()
            .setTitle("🏝️ Catch The Summer Hit")
            .setDescription("Het voelt alsof we dit jaar nog maar weinig zon hebben gezien, dus we hebben hoge verwachtingen voor de zomer! " +
                "En mocht het kwik niet doen wat we zouden willen, dan zorgen wij wel dat de temperatuur stijgt door het afstrepen van zomerhits tijdens Catch The Summerhit! " +
                "Vanaf 26 juni maak je vijf weken lang kans op de leukste zomerprijzen.")
            .addFields({
                name: 'Hoe werkt het?',
                value: "Download de Qmusic app en zorg dat je ingelogd bent. In de navigatiebalk onderaan de app verschijnt een ⭐ **SummerHit** ⭐ knop. " +
                    "Als je hierop klikt, verschijnt er een kaart met titels en artiesten van een aantal summerhits én een Hit van de dag.\n\n" +
                    "Hoor je één van de tracks op jouw kaart voorbijkomen op de radio? " +
                    "Dan heb je de gehele duur van die track de tijd om hem in de app aan te klikken. " +
                    "Heb je op tijd gedrukt? Dan scoor je punten!",
                inline: false
            })
            .addFields({
                name: 'Hoe krijg ik bonus punten?',
                value: "Je kunt extra snel punten verdienen door binnen een bepaalde tijd de volgende hit te vangen. " +
                    "De zogeheten 🚀 **Multiplier** 🚀 loopt steeds verder op, maar de tijd die je hebt om een volgende track af te vinken wordt steeds korter...\n\n" +
                    "Ook deelt het Qmusic team regelmatig een 🔎 **geheime code** 🔎 via hun socials. " +
                    "Deze code kan je invullen via de app of via de \u003C/summerhit entercode:1125502083169276075> commando.",
                inline: false
            })
            .addFields({
                name: 'Prijzen',
                value: "Beland je door de behaalde punten in de top 5 van de week? " +
                    "Dan win je de hoofdprijs. Onder de rest van de deelnemers worden andere zomerse prijzen verloot!\n\n" +
                    "Aan de start van een nieuwe week (op maandag 00:00 uur) wordt jouw puntensaldo weer op 0 gezet, zodat iedereen elke week start met even veel punten."
            })
            .setFooter({
                text: "Meer informatie: https://qmusic.nl/speel-mee-met-catch-the-summerhit-2023",
                iconURL: "https://www.radio.net/images/broadcasts/e8/c0/114914/1/c300.png"
            })
            .setColor(process.env.MAIN_COLOR)

        await interaction.reply({embeds: [embed]});
    }

    async handleSummerHitTrackOfTheDayCommand(interaction) {
        // Check if the track of the day needs to be updated
        await this.catchTheSummerHit.checkForNewDay();

        const trackOfTheDay = this.catchTheSummerHit.trackOfTheDay;

        const embed = new EmbedBuilder()
            .setTitle("🎺 Track of the Day")
            .addFields({
                name: 'Title',
                value: trackOfTheDay.track_title,
                inline: true
            }, {
                name: 'Artist',
                value: trackOfTheDay.artist_name,
                inline: true
            }, {
                name: 'Points',
                value: `+ ${trackOfTheDay.points} points`,
            })
            .setThumbnail(`https://cdn-radio.dpgmedia.net/site/w480${trackOfTheDay.track_thumbnail}`)
            .setColor(process.env.MAIN_COLOR)
            .setFooter({
                text: "Q sounds better with you!",
                iconURL: "https://www.radio.net/images/broadcasts/e8/c0/114914/1/c300.png"
            });

        await interaction.reply({embeds: [embed]});
    }

    async handleSummerHitStatsCommand(interaction) {
        const userId = interaction.user.id;

        const user = this.authBank.getUserByDiscordId(userId);
        if (user == null) {
            await this.sendUnauthorizedMessage(interaction);
            return;
        }

        const contestantInfo = await this.catchTheSummerHit.getContestantInfo(user.username);
        if (!contestantInfo) {
            await this.sendGameUnavailableMessage(interaction);
            return;
        }

        // Checking that if the user just started the game, the songs are initialized
        const trackingUsers = this.catchTheSummerHit.songsCatchers.get(this.catchTheSummerHit.trackOfTheDay.track_title);
        if (!trackingUsers.getUsers().includes(user.username)) {
            await this.catchTheSummerHit.initContestantTracks(user.username);
        }

        const userLeaderboard = await this.catchTheSummerHit.getHighscoresForUser(user.username, 2);

        let multiplierValue = contestantInfo.multiplier.value;
        let multiplierExpiryDate = new Date(contestantInfo.multiplier.expires_at).getTime() / 1000;
        let userLeaderboardRank = userLeaderboard.me.rank;

        const embed = new EmbedBuilder()
            .setTitle("🏝️ Catch The Summer Hit Stats")
            .setDescription(`<@${userId}>'s Catch The Summer Hit stats for this week.`)
            .addFields({
                name: 'Score',
                value: `${contestantInfo.score} points`,
                inline: true
            }, {
                name: 'Current Multiplier',
                value: `${multiplierValue}x - expires at <t:${multiplierExpiryDate}>`,
                inline: true
            }, {
                name: 'Leaderboard Position',
                value: this.numberToEmojis(userLeaderboardRank) + (userLeaderboardRank <= 5 ? ' 🏆' : ''),
                inline: true
            }, {
                name: 'Your Tracks',
                value: this.getPersonalTracksList(contestantInfo),
                inline: false
            })
            .setColor(process.env.MAIN_COLOR)

        await interaction.reply({embeds: [embed]});
    }

    async handleSummerHitLeaderboardCommand(interaction) {
        const userId = interaction.user.id;

        const user = this.authBank.getUserByDiscordId(userId);
        if (user == null) {
            await this.sendUnauthorizedMessage(interaction);
            return;
        }

        const contestantInfo = await this.catchTheSummerHit.getContestantInfo(user.username);
        if (!contestantInfo) {
            await this.sendGameUnavailableMessage(interaction);
            return;
        }

        const count = interaction.options.getInteger('count') || 10;
        const userLeaderboard = await this.catchTheSummerHit.getHighscoresForUser(user.username, count);

        let userLeaderboardRank = userLeaderboard.me.rank;

        const embed = new EmbedBuilder()
            .setTitle("🏝️ Catch The Summer Hit Stats")
            .setDescription(`<@${userId}>'s Catch The Summer Hit stats for this week.`)
            .addFields({
                name: 'Your Score',
                value: `${userLeaderboard.me.score} points`,
                inline: true
            }, {
                name: 'Your Rank',
                value: this.numberToEmojis(userLeaderboardRank) + (userLeaderboardRank <= 5 ? ' 🏆' : ''),
                inline: true
            }, {
                name: `Top ${count} Leaderboard`,
                value: this.getLeaderboardUsers(userLeaderboard.top),
                inline: false
            })
            .setColor(process.env.MAIN_COLOR)

        await interaction.reply({embeds: [embed]});
    }

    getPersonalTracksList(contestantInfo) {
        const tracks = contestantInfo.tracks;
        let message = '';

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];

            message += `${i + 1}. **${track.track_title} - ${track.artist_name}** (+${track.points} points)`;

            if (i < tracks.length - 1) message += '\n';
        }
        return message;
    }

    getLeaderboardUsers(leaderboard) {
        let message = '';

        for (let i = 0; i < leaderboard.length; i++) {
            const user = leaderboard[i];

            message += `${i + 1}. `

            if (i <= 4) message += '🏆 ';

            message += `**${user.name}** from **${user.city}** (${user.score} points)`;
            if (i < leaderboard.length - 1) message += '\n';
        }

        return message;
    }

    numberToEmojis(number) {
        const emojiMap = {
            0: '0️⃣',
            1: '1️⃣',
            2: '2️⃣',
            3: '3️⃣',
            4: '4️⃣',
            5: '5️⃣',
            6: '6️⃣',
            7: '7️⃣',
            8: '8️⃣',
            9: '9️⃣'
        };

        const numberString = number.toString();
        let result = '';

        for (let i = 0; i < numberString.length; i++) {
            const digit = numberString[i];
            if (digit in emojiMap) {
                result += emojiMap[digit];
            }
        }

        return result;
    }

    async sendGameUnavailableMessage(interaction) {
        const embed = new EmbedBuilder()
            .setTitle("🔒 Game unavailable")
            .setDescription("This game is currently unavailable to you. This is likely due to the fact that you have not started the game yet in your app. " +
                "You can do this by clicking the **SummerHit** button in the bottom navigation bar of the app.\n\n" +
                "If you can't see this button, make sure that you entered your phone number, name, and address in your account details.")
            .setColor(process.env.MAIN_COLOR)
            .setFooter({
                text: "Q sounds better with you!",
                iconURL: "https://www.radio.net/images/broadcasts/e8/c0/114914/1/c300.png"
            });

        // reply with ephemeral message
        await interaction.reply({embeds: [embed], ephemeral: true});
    }

    async sendUnauthorizedMessage(interaction) {
        const embed = new EmbedBuilder()
            .setTitle("🔒 No account found")
            .setDescription("No Qmusic account was found in the saved accounts list. In order to use this command, please link your account first with the `/qmusic addacount` command or ask an admin to do this for you.\n\n" +
                "*Please note that in order to link your account, you need to provide your __username__ (email) and __password__. Only share this with people you trust.*")
            .setColor(process.env.MAIN_COLOR)
            .setFooter({
                text: "Q sounds better with you!",
                iconURL: "https://www.radio.net/images/broadcasts/e8/c0/114914/1/c300.png"
            });

        await interaction.reply({embeds: [embed], ephemeral: true});
    }

}

module.exports = CommandHandler