const {EmbedBuilder, ActionRowBuilder, ButtonBuilder} = require("discord.js");
const {joinVoiceChannel, createAudioPlayer} = require("@discordjs/voice");
const {ButtonStyle} = require("discord-api-types/v8");

class CommandHandler {

    /**
     * @param {DiscordBot} discordBot
     */
    constructor(discordBot) {
        this.discordBot = discordBot;
    }

    async handleSummerHitAboutCommand(interaction) {
        if (!this.discordBot.catchTheSummerHit.available) {
            await this.#sendGameNotAvailableMessage(interaction)
            return;
        }

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
        if (!this.discordBot.catchTheSummerHit.available) {
            await this.#sendGameNotAvailableMessage(interaction)
            return;
        }
        // Check if the track of the day needs to be updated
        await this.discordBot.catchTheSummerHit.checkForNewDay();

        const trackOfTheDay = this.discordBot.catchTheSummerHit.trackOfTheDay;
        const embed = this.getTrackOfTheDayEmbed(trackOfTheDay);

        await interaction.reply({embeds: [embed]});
    }

    async handleSummerHitStatsCommand(interaction) {
        if (!this.discordBot.catchTheSummerHit.available) {
            await this.#sendGameNotAvailableMessage(interaction)
            return;
        }
        const userId = interaction.user.id;

        const user = this.discordBot.authBank.getUserByDiscordId(userId);
        if (user == null) {
            await this.#sendUnauthorizedMessage(interaction);
            return;
        }

        const contestantInfo = await this.discordBot.catchTheSummerHit.getContestantInfo(user.username);
        if (!contestantInfo) {
            await this.#sendGameUnavailableMessage(interaction);
            return;
        }

        // Checking that if the user just started the game, the songs are initialized
        if (this.discordBot.catchTheSummerHit.trackOfTheDay) {
            const trackingUsers = this.discordBot.catchTheSummerHit.songsCatchers.get(this.discordBot.catchTheSummerHit.trackOfTheDay.track_title.toUpperCase());
            if (!trackingUsers.getUsers().includes(user.username)) {
                await this.discordBot.catchTheSummerHit.initContestantTracks(user.username);
            }
        }

        const userLeaderboard = await this.discordBot.catchTheSummerHit.getHighscoresForUser(user.username, 2);

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
                value: this.#numberToEmojis(userLeaderboardRank) + (userLeaderboardRank <= 5 ? ' 🏆' : ''),
                inline: true
            }, {
                name: 'Your Tracks',
                value: this.#getPersonalTracksList(user.username, contestantInfo),
                inline: false
            })
            .setColor(process.env.MAIN_COLOR)

        await interaction.reply({embeds: [embed]});
    }

    async handleSummerHitLeaderboardCommand(interaction) {
        if (!this.discordBot.catchTheSummerHit.available) {
            await this.#sendGameNotAvailableMessage(interaction)
            return;
        }
        const userId = interaction.user.id;

        const global = interaction.options.getBoolean('global') || false;
        if (!global) {
            await this.handleSummerHitLeaderboardInternalCommand(interaction);
            return;
        }

        const user = this.discordBot.authBank.getUserByDiscordId(userId);
        if (user == null) {
            await this.#sendUnauthorizedMessage(interaction);
            return;
        }

        const contestantInfo = await this.discordBot.catchTheSummerHit.getContestantInfo(user.username);
        if (!contestantInfo) {
            await this.#sendGameUnavailableMessage(interaction);
            return;
        }

        const count = interaction.options.getInteger('count') || 10;
        const userLeaderboard = await this.discordBot.catchTheSummerHit.getHighscoresForUser(user.username, count);

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
                value: this.#numberToEmojis(userLeaderboardRank) + (userLeaderboardRank <= 5 ? ' 🏆' : ''),
                inline: true
            }, {
                name: `Top ${count} Leaderboard`,
                value: this.#getLeaderboardUsers(userLeaderboard.top),
                inline: false
            })
            .setColor(process.env.MAIN_COLOR)

        await interaction.reply({embeds: [embed]});
    }

    async handleSummerHitLeaderboardInternalCommand(interaction) {
        const users = Array.from(this.discordBot.authBank.getUsers());

        const promises = [];
        for (const user of users) {
            promises.push(this.discordBot.catchTheSummerHit.getHighscoresForUser(user.username, 0, true));
        }

        let rankArray = [];

        const contestantInfos = await Promise.allSettled(promises);
        for (let i = 0; i < contestantInfos.length; i++) {
            const result = contestantInfos[i];
            if (result.status !== 'fulfilled' || !result.value) {
                continue;
            }

            if (result.value.status === 200) {
                const user = users[i];
                const data = result.value.data.highscores.me;
                const score = data.score;
                const rank = data.rank;

                rankArray.push({
                    rank: rank,
                    score: score,
                    discordId: user.discord_id,
                    username: user.username,
                    emojiNumbers: this.#numberToEmojis(rank),
                });
            } else {
                console.log('Invalid status code:', result.value.status);
            }
        }

        if (rankArray.length === 0) {
            await interaction.reply({content: "No internal stats could be fetched."});
            return;
        }

        rankArray.sort((a, b) => a.rank - b.rank);

        // add a ⬛ to the front of the rank to make it the same length as the longest rank
        const longestRank = rankArray[rankArray.length - 1].emojiNumbers.length / 3;
        for (let i = 0; i < rankArray.length; i++) {
            const rank = rankArray[i];
            const rankLength = rank.emojiNumbers.length / 3;
            const difference = longestRank - rankLength;
            rankArray[i].emojiNumbers = '⬛'.repeat(difference) + rank.emojiNumbers;
        }

        const embed = new EmbedBuilder()
            .setTitle("🏝️ Catch The Summer Hit Leaderboard")
            .setDescription(`Internal leaderboard for Catch The Summer Hit.`)
            .setColor(process.env.MAIN_COLOR)
            .setFooter({
                text: "Q sounds better with you!",
                iconURL: "https://www.radio.net/images/broadcasts/e8/c0/114914/1/c300.png"
            })
            .addFields({
                name: 'Leaderboard',
                value: rankArray.map((value) => `${value.emojiNumbers} ${value.rank <= 5 ? '🏆' : ''} ${value.discordId ? `<@${value.discordId}> - ` : ''} **${value.username}** (${value.score} points)`).join('\n'),
            });

        await interaction.reply({embeds: [embed]});
    }

    async handleQmusicAddAccountCommand(interaction) {
        let userId = interaction.options.getUser('user')?.id ?? interaction.user.id;

        const username = interaction.options.getString('username');
        const password = interaction.options.getString('password');

        let user = this.discordBot.authBank.getUser(username);
        if (user != null) {
            await this.#sendAccountAlreadyLinkedMessage(interaction);
            return;
        }

        user = await this.discordBot.authBank.addUser(username, password, userId, true);

        // Refreshing the token to make sure it's valid
        if (user) await this.discordBot.authBank.refreshUserToken(username, true, true);

        if (!user || !user.token) {
            await this.#sendInvalidCredentialsMessage(interaction);
            await this.discordBot.authBank.removeUser(username);
            return;
        }

        await this.discordBot.catchTheSummerHit.initContestantTracks(username);

        await this.#sendAccountLinkedMessage(interaction, username, userId);
    }

    async handleQmusicRemoveAccountCommand(interaction) {
        const user = await this.#getTargetUser(interaction);
        if (!user) return;

        this.discordBot.catchTheSummerHit.removeUser(user.username);
        await this.discordBot.authBank.removeUser(user.username);

        await this.#sendAccountRemovedMessage(interaction, user.username);
    }

    /**
     * Get the target user for the command.
     * @param interaction
     * @returns {Promise<Account|null>}
     */
    async #getTargetUser(interaction) {
        let userId = interaction.user.id;

        const username = interaction.options.getString('username');

        let user;
        if (username) {
            user = this.discordBot.authBank.getUser(username);
            if (user == null) {
                await this.#sendNoAccountFoundMessage(interaction, username);
                return null;
            }
        } else {
            user = this.discordBot.authBank.getUserByDiscordId(userId);
            if (user == null) {
                await this.#sendUnauthorizedMessage(interaction);
                return null;
            }
        }
        return user;
    }

    async handleSummerHitSettingsCommand(interaction) {
        const userId = interaction.user.id;

        const user = this.discordBot.authBank.getUserByDiscordId(userId);
        if (user == null) {
            await this.#sendUnauthorizedMessage(interaction);
            return;
        }

        const enable = interaction.options.getBoolean('enable');
        const notify = interaction.options.getBoolean('notify');
        const catchAtNight = interaction.options.getBoolean('catch_at_night');

        const settings = user.settings.catch_the_summer_hit;

        if (enable != null) settings.enabled = enable;
        if (notify != null) settings.notify = notify;
        if (catchAtNight != null) settings.catch_at_night = catchAtNight;

        // save if one of the settings changed
        if (enable != null || notify != null || catchAtNight != null) {
            await this.discordBot.authBank.saveUsers();

            await this.discordBot.catchTheSummerHit.initContestantTracks(user.username);
        }

        const embed = new EmbedBuilder()
            .setTitle("⚙️ Catch The Summer Hit Settings")
            .setDescription('Your Catch The Summer Hit settings.')
            .addFields(
                {name: 'Enabled', value: settings.enabled ? '✅ Enabled' : '❌ Disabled', inline: true},
                {
                    name: 'Notify',
                    value: settings.notify ? '✅ You will be notified when we caught one of your songs!' : '❌ You will __not__ be notified when we catch one of your songs.',
                    inline: true
                },
                {
                    name: 'Catch At Night',
                    value: settings.catch_at_night ? '✅ We will catch songs at night (between 2 and 6)!' : '❌ We will __not__ catch songs at night (between 2 and 6).',
                    inline: true
                },
            ).setColor(process.env.MAIN_COLOR)
            .setFooter({
                text: "Q sounds better with you!",
                iconURL: "https://www.radio.net/images/broadcasts/e8/c0/114914/1/c300.png"
            })

        await interaction.reply({embeds: [embed]});
    }

    async handleQmusicListenCommand(interaction) {
        // check if user is in a voice channel
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            await this.#sendNotInVoiceChannelMessage(interaction);
            return;
        }

        const station = interaction.options.getString('station') ?? 'qmusic_nl';
        if (!this.discordBot.radioListener.stations.has(station)) {
            await this.#sendInvalidStationMessage(interaction);
            return;
        }

        if (this.discordBot.radioListener.player) {
            this.discordBot.radioListener.stop();
        }

        await this.discordBot.radioListener.playStation(station, voiceChannel, interaction.channelId);

        await this.#sendListeningMessage(interaction, station);
    }

    async handleQmusicStopCommand(interaction) {
        if (!this.discordBot.radioListener.player) {
            await this.#sendNotListeningMessage(interaction);
            return;
        }

        this.discordBot.radioListener.stop();

        await this.#sendStoppedListeningMessage(interaction);
    }

    async handleCatchArtistSettingsCommand(interaction) {
        const userId = interaction.user.id;

        const user = this.discordBot.authBank.getUserByDiscordId(userId);
        if (user == null) {
            await this.#sendUnauthorizedMessage(interaction);
            return;
        }

        const enable = interaction.options.getBoolean('enable');
        const notify = interaction.options.getBoolean('notify');
        const artist = interaction.options.getString('artist');
        const sendAppMessage = interaction.options.getBoolean('send_app_message');
        const notifyWhenUpcoming = interaction.options.getBoolean('notify_when_upcoming');

        const settings = user.settings.catch_the_artist;

        if (enable != null) settings.enabled = enable;
        if (notify != null) settings.notify = notify;
        if (artist != null) settings.artist_name = artist.toUpperCase();
        if (sendAppMessage != null) settings.send_app_message = sendAppMessage;
        if (notifyWhenUpcoming != null) settings.notify_when_upcoming = notifyWhenUpcoming;

        // save if one of the settings changed
        if (enable != null || notify != null || artist != null || sendAppMessage != null || notifyWhenUpcoming != null) {
            await this.discordBot.authBank.saveUsers();

            this.discordBot.catchTheArtist.initContestant(user);
        }

        const embed = new EmbedBuilder()
            .setTitle("⚙️ Catch The Artist Settings")
            .setDescription(`Your Catch The Artist settings have been updated.`)
            .addFields(
                {name: 'Enabled', value: settings.enabled ? '✅ Enabled' : '❌ Disabled', inline: true},
                {name: 'Artist', value: settings?.artist_name ?? 'Not set', inline: true},
                {
                    name: 'Notify',
                    value: settings.notify ? '✅ You will receive pings when it\'s time!' : '❌ You will __not__ receive pings when it\'s time',
                    inline: true
                },
                {
                    name: 'Notify when upcoming',
                    value: settings.notify_when_upcoming ? '✅ You will receive pings when the artist is will be playing next!' : '❌ You will __not__ receive pings when the artist will be playing next!',
                    inline: true
                },
                {
                    name: 'Send app message',
                    value: settings.send_app_message ? '✅ The bot will automatically send the message for you in the Qmusic app when the song is playing!' : '❌ The bot will __not__ automatically send the message for you in the Qmusic app! You will have to do this yourself.',
                    inline: true
                },
            )
            .setColor(process.env.MAIN_COLOR)
            .setFooter({
                text: "Q sounds better with you!",
                iconURL: "https://www.radio.net/images/broadcasts/e8/c0/114914/1/c300.png"
            })

        await interaction.reply({embeds: [embed]});
    }

    getTrackOfTheDayEmbed(trackOfTheDay) {
        const embed = new EmbedBuilder()
            .setTitle("🎺 Track of the Day")
            .addFields({
                name: 'Title',
                value: trackOfTheDay?.track_title ?? 'No track of the day yet',
                inline: true
            }, {
                name: 'Artist',
                value: trackOfTheDay?.artist_name ?? 'Not available',
                inline: true
            }, {
                name: 'Points',
                value: `+ ${trackOfTheDay?.points ?? 0} points`,
            })
            .setColor(process.env.MAIN_COLOR)
            .setFooter({
                text: "Q sounds better with you!",
                iconURL: "https://www.radio.net/images/broadcasts/e8/c0/114914/1/c300.png"
            });
        if (trackOfTheDay?.track_thumbnail) embed.setThumbnail(`https://cdn-radio.dpgmedia.net/site/w480${trackOfTheDay.track_thumbnail}`)
        return embed;
    }

    #getPersonalTracksList(username, contestantInfo) {
        // const tracks = contestantInfo.tracks;
        const tracks = Array.from(this.discordBot.catchTheSummerHit.songsCatchers.values())
            .filter(c => c.hasUser(username));
        let message = '';

        let i;
        for (i = 0; i < tracks.length; i++) {
            const track = tracks[i];

            message += `${i + 1}. **${track.track_title} - ${track.artist_name}** (+${track.points} points)`;

            if (i < tracks.length - 1) message += '\n';
        }

        return message;
    }

    async handleHetGeluidInfoCommand(interaction) {
        const soundInfo = await this.discordBot.hetGeluid.fetchSoundInfo();

        if (!soundInfo) return await this.#sendHetGeluidSoundUnavailable(interaction);

        const answers = await this.discordBot.hetGeluid.fetchAnswers();

        let audioName = soundInfo.getAudioName();
        const embed = new EmbedBuilder()
            .setTitle("🔊 Het Geluid")
            .addFields(
                {name: 'Value', value: `€ ${new Intl.NumberFormat('nl-NL').format(soundInfo.amount)}`, inline: true},
                {name: 'Audio Name', value: audioName ? `\`${audioName.replace('.mp3', '')}\`` : '❌ Not available', inline: true}
            )
            .setColor(process.env.MAIN_COLOR)
            .setFooter({
                text: "Q sounds better with you!",
                iconURL: "https://www.radio.net/images/broadcasts/e8/c0/114914/1/c300.png"
            });

        if (answers) {
            embed.addFields(
                {name: 'Attempts', value: `${answers.length} wrong attempts`, inline: true},
            )
        }

        await interaction.reply({
            embeds: [embed],
            components: soundInfo.audio ? [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setURL(soundInfo.audio)
                        .setStyle(ButtonStyle.Link)
                        .setLabel('Listen to the sound!')
                )
            ] : []
        });
    }

    async handleHetGeluidSignupCommand(interaction) {
        const user = await this.#getTargetUser(interaction);
        if (!user) return;

        let currentSignupMoment = await this.discordBot.hetGeluid.getCurrentSignUpMoment();
        if (!currentSignupMoment) {
            console.log('Het Geluid is not available at the moment');
            return await this.#sendHetGeluidSoundUnavailable(interaction);
        }

        const subscribed = await this.discordBot.hetGeluid.hasUserSubscribed(user.username, currentSignupMoment);
        console.log('subscribed', subscribed)
        if (subscribed) {
            return await this.#sendEmbedMessage(
                interaction,
                'Already subscribed',
                `You have already signed up for Het Geluid of <t:${currentSignupMoment.hiddenAt.getTime() / 1000}:D>. ` +
                `You can sign up for the next day in <t:${currentSignupMoment.hiddenAt.getTime() / 1000}:R>.`
            );
        }

        currentSignupMoment = await this.discordBot.hetGeluid.subscribeUser(user.username);
        console.log(currentSignupMoment)
        if (!currentSignupMoment) return await this.#sendHetGeluidSoundUnavailable(interaction);

        await this.#sendEmbedMessage(
            interaction,
            'You signed up for Het Geluid!',
            `You have signed up for Het Geluid of <t:${currentSignupMoment.hiddenAt.getTime() / 1000}:D>.\nLet's hope you get called!`,
            '✅'
        );
    }

    async handleHetGeluidFindAnswerCommand(interaction) {
        const answer = interaction.options.getString('answer');

        const answers = await this.discordBot.hetGeluid.findAnswer(answer);

        if (!answers || answers.length === 0) {
            return await this.#sendEmbedMessage(
                interaction,
                'No matches found!',
                `There were no previous answers that matched \`${answer}\`. Make sure that you didn't enter an entire sentence and that you spelled it correctly; otherwise, there's potential...`,
                '✅',
                false
            );
        }

        await this.#sendEmbedMessage(
            interaction,
            `${answers.length} matches found`,
            answers.map(a => `- _"${a.highlighted(answer)}"_ - guessed by ${a.name} on <t:${a.guessed_at.getTime() / 1000}:f>`).join('\n'),
            '🫠',
            false
        )
    }

    async handleHetGeluidSettingsCommand(interaction) {
        const user = await this.#getTargetUser(interaction);
        if (!user) return;

        const autoSignup = interaction.options.getBoolean('auto_signup');

        const settings = user.settings.het_geluid;
        if (autoSignup != null) settings.auto_signup = autoSignup;

        if (autoSignup != null) {
            await this.discordBot.authBank.saveUsers();
        }

        const embed = new EmbedBuilder()
            .setTitle("⚙️ Het Geluid Settings")
            .setDescription(`Your Het Geluid settings have been updated.`)
            .addFields(
                {name: 'Auto Signup', value: settings.auto_signup ? '✅ Enabled' : '❌ Disabled', inline: true},
            )
            .setColor(process.env.MAIN_COLOR)
            .setFooter({
                text: "Q sounds better with you!",
                iconURL: "https://www.radio.net/images/broadcasts/e8/c0/114914/1/c300.png"
            })

        await interaction.reply({embeds: [embed]});
    }

    #getLeaderboardUsers(leaderboard) {
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

    #numberToEmojis(number) {
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

    async #sendEmbedMessage(interaction, title, description, emote = '❌', ephemeral = true) {
        const embed = new EmbedBuilder()
            .setTitle((emote ? `${emote} ` : '') + title)
            .setDescription(description)
            .setColor(process.env.MAIN_COLOR)
            .setFooter({
                text: "Q sounds better with you!",
                iconURL: "https://www.radio.net/images/broadcasts/e8/c0/114914/1/c300.png"
            });

        await interaction.reply({embeds: [embed], ephemeral: ephemeral});
    }

    async #sendNotListeningMessage(interaction) {
        return await this.#sendEmbedMessage(
            interaction,
            "Not listening",
            "You are not listening to a radio station. Please use the `/qmusic listen` command to start listening to a radio station."
        );
    }

    async #sendStoppedListeningMessage(interaction) {
        await this.#sendEmbedMessage(
            interaction,
            "📻 Stopped listening",
            "You are no longer listening to the radio.",
            null,
            false
        );
    }

    async #sendListeningMessage(interaction, stationId) {
        const station = this.discordBot.radioListener.stations.get(stationId);

        await this.#sendEmbedMessage(
            interaction,
            "📻 Listening to " + station.name,
            "You are now listening to " + station.name + ".",
            null,
            false
        );
    }

    async #sendInvalidStationMessage(interaction) {
        return await this.#sendEmbedMessage(
            interaction,
            'Invalid station',
            'This is not a valid station. Please use one of the following stations: ' +
            Array.from(this.discordBot.radioListener.stations.keys()).join(', ')
        );
    }

    async #sendGameNotAvailableMessage(interaction) {
        return await this.#sendEmbedMessage(
            interaction,
            'Game not available',
            'This game is currently not available. Please try again later.'
        );
    }

    async #sendHetGeluidSoundUnavailable(interaction) {
        return this.#sendEmbedMessage(
            interaction,
            'Something went wrong',
            "Something didn't go right when we looked up the information about Het Geluid. Please try again later."
        );
    }

    async #sendNotInVoiceChannelMessage(interaction) {
        return this.#sendEmbedMessage(
            interaction,
            'Not in a voice channel',
            'You need to be in a voice channel to use this command.'
        );
    }

    async #sendGameUnavailableMessage(interaction) {
        return this.#sendEmbedMessage(
            interaction,
            'Game unavailable',
            "This game is currently unavailable to you. This is likely due to the fact that you have not started the game yet in your app " +
            "or that Qmusic is currently not hosting this game. " +
            "Check if you see the game's button in the bottom navigation bar of the app.\n\n" +
            "If you can't see this button, make sure that you entered your phone number, name, and address in your account details, " +
            "and if Qmusic is actually hosting the game.",
            '🔒'
        );
    }

    async #sendAccountLinkedMessage(interaction, username, userId) {
        return await this.#sendEmbedMessage(
            interaction,
            "Account linked",
            `A Qmusic account with the username \`${username}\` has been successfully linked to <@${userId}>'s Discord account. They can now use the other Qmusic commands.`,
            '✅'
        );
    }

    async #sendAccountAlreadyLinkedMessage(interaction) {
        return await this.#sendEmbedMessage(
            interaction,
            "Account already linked",
            "This Qmusic account is already known by the bot. If you want to replace this account or change it credentials, please remove the account first. " +
            "You can do this by using the \u003C/qmusic removeaccount:1125771007748210728> command.",
            '🔒'
        );
    }

    async #sendInvalidCredentialsMessage(interaction) {
        return await this.#sendEmbedMessage(
            interaction,
            'Invalid credentials',
            'The credentials you provided were invalid. Please check if you entered the correct username (email) and password and try again.',
            '🔒'
        );
    }

    async #sendAccountRemovedMessage(interaction, username) {
        return await this.#sendEmbedMessage(
            interaction,
            "Account removed",
            `The Qmusic account with the username \`${username}\` has been successfully removed from the bot.`,
            '✅'
        );
    }

    async #sendNoAccountFoundMessage(interaction, username) {
        return await this.#sendEmbedMessage(
            interaction,
            "No account found",
            `No Qmusic account was found with the username \`${username}\`. You can add their account` +
            `with the \u003C/qmusic addaccount:1125771007748210728> command or ask an admin to do this for you.\n\n` +
            "*Please note that in order to link your account, you need to provide your __username__ (email) and __password__. Only share this with people you trust.*",
        );
    }

    async #sendUnauthorizedMessage(interaction) {
        return await this.#sendEmbedMessage(
            interaction,
            'No account found',
            "No Qmusic account was found in the saved accounts list. In order to use this command, please link your account first " +
            "with the \u003C/qmusic addaccount:1125771007748210728> command or ask an admin to do this for you.\n\n" +
            "*Please note that in order to link your account, you need to provide your __username__ (email) and __password__. Only share this with people you trust.*",
            '🔒'
        );
    }

}

module.exports = CommandHandler