const {
    Client, GatewayIntentBits, SlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandIntegerOption, SlashCommandStringOption, CommandInteraction,
    SlashCommandUserOption, MessagePayload, SlashCommandBooleanOption
} = require("discord.js");
const CommandHandler = require("./CommandHandler");
const CatchTheSummerHit = require("./games/CatchTheSummerHit");
const SocketListener = require("./SocketListener");

class DiscordBot {

    constructor(authBank) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.MessageContent,
            ]
        });
        this.authBank = authBank;

        this.#initListeners();
        this.client.login(process.env.DISCORD_TOKEN)
    }

    #initListeners() {
        this.client.on('ready', () => {
            this.#initCommands()

            this.catchTheSummerHit = new CatchTheSummerHit(this);
            this.commandHandler = new CommandHandler(this);
            this.socket = new SocketListener(this);

            console.log(`Bot is ready. Logged in as ${this.client.user.tag}`);
        });

        this.client.on('interactionCreate', async interaction => {
            await this.#handleInteraction(interaction);
        })
    }

    #initCommands() {
        /*
        /summerhit about
        /summerhit trackoftheday
        /summerhit stats
        /summerhit leaderboard [count]
        /summerhit entercode <code>
        /summerhit settings [enable] [notify] [catch_at_night]

        /catchtheartist settings [enable] [notify] [artist] [send_app_message] [notify_when_upcoming]

        /qmusic addaccount <username> <password> [user]
        /qmusic removeaccount [username]
         */
        const commands = [
            new SlashCommandBuilder()
                .setName('summerhit')
                .setDescription('Qmusic\'s Catch The Summer Hit game')
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('about')
                    .setDescription('Get information about the game'))
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('trackoftheday')
                    .setDescription('Get the track of the day'))
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('stats')
                    .setDescription('Get your personal weekly tracks and stats'))
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('leaderboard')
                    .setDescription('Get the leaderboard')
                    .addIntegerOption(
                        new SlashCommandIntegerOption()
                            .setName('count')
                            .setDescription('The amount of users to show')
                            .setMaxValue(50)
                            .setMinValue(1)
                            .setRequired(false)
                            .setChoices({name: 'All', value: 50}, {name: 'Top 5', value: 5}, {name: 'Top 10', value: 10}, {name: 'Top 25', value: 25})
                    ))
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('entercode')
                    .setDescription('Enter a secret code to get bonus points')
                    .addStringOption(
                        new SlashCommandStringOption()
                            .setName('code')
                            .setDescription('The secret code')
                            .setRequired(true)
                    ))
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('settings')
                    .setDescription('Change your Catch The Summer Hit settings')
                    .addBooleanOption(
                        new SlashCommandBooleanOption()
                            .setName('enable')
                            .setDescription('Enable or disable the game')
                    ).addBooleanOption(
                        new SlashCommandBooleanOption()
                            .setName('notify')
                            .setDescription('Whether you want to receive notifications for catches')
                    ).addBooleanOption(
                        new SlashCommandBooleanOption()
                            .setName('catch_at_night')
                            .setDescription('Whether you want to songs to be caught at night')
                    )
                ),
            new SlashCommandBuilder()
                .setName("qmusic")
                .setDescription("General Qmusic commands")
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('addaccount')
                    .setDescription('Add your Qmusic account to your Discord account')
                    .addStringOption(
                        new SlashCommandStringOption()
                            .setName('username')
                            .setDescription('Your Qmusic email address')
                            .setRequired(true)
                    ).addStringOption(
                        new SlashCommandStringOption()
                            .setName('password')
                            .setDescription('Your Qmusic password')
                            .setRequired(true)
                    ).addUserOption(new SlashCommandUserOption()
                        .setName('user')
                        .setDescription('The user that this account belongs to')
                        .setRequired(false)
                    )
                )
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('removeaccount')
                    .setDescription('Remove your Qmusic account from your Discord account')
                    .addStringOption(new SlashCommandStringOption()
                        .setName('username')
                        .setDescription('The username of the account to remove the account from')
                        .setRequired(false)
                    )
                ),
            new SlashCommandBuilder()
                .setName("catchartist")
                .setDescription("Qmusic's Catch The Artist game")
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('settings')
                    .setDescription('Change your Catch The Artist settings')
                    .addBooleanOption(
                        new SlashCommandBooleanOption()
                            .setName('enable')
                            .setDescription('Enable or disable the game')
                    ).addBooleanOption(
                        new SlashCommandBooleanOption()
                            .setName('notify')
                            .setDescription('Whether you want to receive notifications for catches')
                    ).addStringOption(
                        new SlashCommandStringOption()
                            .setName('artist')
                            .setDescription('The artist you want to catch')
                    ).addBooleanOption(
                        new SlashCommandBooleanOption()
                            .setName('send_app_message')
                            .setDescription('Whether you want the bot to automatically send a message to the Qmusic app')
                    ).addBooleanOption(
                        new SlashCommandBooleanOption()
                            .setName('notify_when_upcoming')
                            .setDescription('Whether you want to receive a notification when the artist is coming up')
                    )
                )
        ];

        this.client.application.commands.set(commands).catch(console.error);
    }

    async #handleInteraction(interaction) {
        if (interaction instanceof CommandInteraction) {
            if (interaction.commandName === 'qmusic') {
                const subCommand = interaction.options.getSubcommand(false);

                switch (subCommand) {
                    case 'addaccount':
                        await this.commandHandler.handleQmusicAddAccountCommand(interaction);
                        break;
                    case 'removeaccount':
                        await this.commandHandler.handleQmusicRemoveAccountCommand(interaction);
                        break;
                }

            } else if (interaction.commandName === 'summerhit') {
                const subCommand = interaction.options.getSubcommand(false);

                switch (subCommand) {
                    case 'about':
                        await this.commandHandler.handleSummerHitAboutCommand(interaction);
                        break;
                    case 'trackoftheday':
                        await this.commandHandler.handleSummerHitTrackOfTheDayCommand(interaction);
                        break;
                    case 'stats':
                        await this.commandHandler.handleSummerHitStatsCommand(interaction);
                        break;
                    case 'leaderboard':
                        await this.commandHandler.handleSummerHitLeaderboardCommand(interaction);
                        break;
                    case 'entercode':
                        const code = interaction.options.getString('code');
                        await interaction.reply({content: 'This command is not yet implemented', ephemeral: true});
                        break;
                    case 'settings':
                        await this.commandHandler.handleSummerHitSettingsCommand(interaction);
                        break;
                }
            } else if (interaction.commandName === 'catchartist') {
                const subCommand = interaction.options.getSubcommand(false);

                switch (subCommand) {
                    case 'settings':
                        await this.commandHandler.handleCatchArtistSettingsCommand(interaction);
                        break;
                }
            }
        }

    }

    /**
     * Send a message to a channel
     * @param {string|MessagePayload} message The message to send
     * @param {string} channelId The ID of the channel to send the message to
     * @returns {Promise<Message<true>>}
     */
    async sendMessage(message, channelId = process.env.DISCORD_CHANNEL_ID) {
        const channel = this.client.channels.cache.get(channelId) ?? await this.client.channels.fetch(channelId);

        return await channel.send(message);
    }

}

module.exports = DiscordBot;