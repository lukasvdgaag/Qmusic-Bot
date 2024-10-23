import {
    Client,
    CommandInteraction,
    GatewayIntentBits,
    Interaction,
    MessagePayload,
    SlashCommandBooleanOption,
    SlashCommandBuilder,
    SlashCommandIntegerOption,
    SlashCommandStringOption,
    SlashCommandSubcommandBuilder,
    SlashCommandUserOption,
    CommandInteractionOptionResolver, ChatInputCommandInteraction, TextBasedChannel, MessageCreateOptions
} from "discord.js";
import {CommandHandler} from "./CommandHandler";
import {CatchTheSummerHit} from "./games/CatchTheSummerHit";
import {SocketListener} from "./SocketListener";
import {CatchTheArtist} from "./games/CatchTheArtist";
import {RadioListener} from "./radio/RadioListener";
import {getNowDate} from "./helpers/TimeHelper";
import {HetGeluid} from "./games/HetGeluid";
import {AuthBank} from "./auth/AuthBank";

export class DiscordBot {

    authBank: AuthBank;
    client: Client;
    radioListener: RadioListener;
    catchTheArtist: CatchTheArtist;
    socket?: SocketListener;
    hetGeluid?: HetGeluid;
    commandHandler?: CommandHandler;
    catchTheSummerHit?: CatchTheSummerHit;

    constructor(authBank: AuthBank) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildVoiceStates,
            ]
        });
        this.authBank = authBank;

        this.radioListener = new RadioListener(this);

        this.#initListeners();
        this.client.login(process.env.DISCORD_TOKEN)
    }

    #initListeners() {
        this.client.on('ready', async () => {
            await this.radioListener.loadStations();
            this.#initCommands();

            this.catchTheSummerHit = new CatchTheSummerHit(this);
            this.catchTheArtist = new CatchTheArtist(this);
            this.commandHandler = new CommandHandler(this);
            this.hetGeluid = new HetGeluid(this);
            this.socket = new SocketListener(this);

            console.log(`Bot is ready. Logged in as ${this.client.user?.tag}`);
        });

        this.client.on('interactionCreate', async interaction => {
            await this.#handleInteraction(interaction);
        });

        this.client.on('voiceStateUpdate', async (oldState, newState) => {
            if (!this.client?.user) return;

            const botId = this.client.user.id;

            const oldChannel = oldState.channel;
            const newChannel = newState.channel;

            // check if there is no one left in the voice channel
            if (oldChannel && oldChannel.members.size === 1 && oldChannel.members.has(botId)) {
                this.radioListener.stop();
                await this.sendMessage("Leaving the voice channel because I'm alone :pensive:.");
                return;
            }

            if (newState.member?.id !== botId) return;

            // bot got disconnected / kicked
            if (oldChannel && !newChannel && this.radioListener.activeChannel) {
                await this.radioListener.stop();
                await this.sendMessage("I got kicked from the channel. Stopping the radio.");
                return;
            }

            // bot got moved to another channel
            if (this.radioListener.activeChannel && oldChannel && newChannel && oldChannel.id !== newChannel.id) {
                this.radioListener.activeChannel = newChannel.id;
                await this.sendMessage(`I got moved to <#${newChannel.id}>.`);
            }

        });
    }

    #initCommands() {
        if (!this.client?.application) {
            return;
        }

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
        /qmusic listen [station]

        /hetgeluid info
        /hetgeluid signup [username]
        /hetgeluid findanswer <answer>
        /hetgeluid settings [auto_signup] [username]
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
                    .addBooleanOption(new SlashCommandBooleanOption()
                        .setName('global')
                        .setDescription('Whether to show the global leaderboard instead of bot users only')
                        .setRequired(false)
                    )
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
                )
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('listen')
                    .setDescription('Listen to Qmusic in your voice channel')
                    .addStringOption(new SlashCommandStringOption()
                        .setName('station')
                        .setDescription('The station to listen to')
                        .setRequired(false)
                        .setChoices(...this.radioListener.getCommandOptions())
                    )
                )
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('stop')
                    .setDescription('Stop listening to Qmusic')
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
                ),
            new SlashCommandBuilder()
                .setName("hetgeluid")
                .setDescription("Qmusic's Het Geluid game")
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('info')
                    .setDescription('Get the current worth of Het Geluid and the link to audio of Het Geluid')
                )
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('signup')
                    .setDescription("Sign up for today's/next day's guessing moment")
                    .addStringOption(
                        new SlashCommandStringOption()
                            .setName('username')
                            .setDescription('Optional username of the user to sign up for')
                            .setRequired(false)
                    )
                )
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('findanswer')
                    .setDescription('Look up previous wrong attempts of other people')
                    .addStringOption(
                        new SlashCommandStringOption()
                            .setName('answer')
                            .setDescription('The answer to look up')
                            .setRequired(true)
                    )
                )
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('settings')
                    .setDescription('Change your Het Geluid settings')
                    .addBooleanOption(
                        new SlashCommandBooleanOption()
                            .setName('auto_signup')
                            .setDescription('Whether you want to automatically sign up for the next guessing moment')
                            .setRequired(false)
                    ).addStringOption(
                        new SlashCommandStringOption()
                            .setName('username')
                            .setDescription('The username of the user to change the settings of')
                            .setRequired(false)
                    )
                ),
        ];

        this.client.application.commands.set(commands).catch(console.error);
    }

    async #handleInteraction(interaction: Interaction) {
        if (interaction instanceof ChatInputCommandInteraction) {
            if (interaction.commandName === 'qmusic') {
                const subCommand = interaction.options.getSubcommand(false);

                switch (subCommand) {
                    case 'addaccount':
                        await this.commandHandler.handleQmusicAddAccountCommand(interaction);
                        break;
                    case 'removeaccount':
                        await this.commandHandler.handleQmusicRemoveAccountCommand(interaction);
                        break;
                    case 'listen':
                        await this.commandHandler.handleQmusicListenCommand(interaction);
                        break;
                    case 'stop':
                        await this.commandHandler.handleQmusicStopCommand(interaction);
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
            } else if (interaction.commandName === 'hetgeluid') {
                const subCommand = interaction.options.getSubcommand(false);

                switch (subCommand) {
                    case 'info':
                        await this.commandHandler.handleHetGeluidInfoCommand(interaction);
                        break;
                    case 'signup':
                        await this.commandHandler.handleHetGeluidSignupCommand(interaction);
                        break;
                    case 'findanswer':
                        await this.commandHandler.handleHetGeluidFindAnswerCommand(interaction);
                        break;
                    case 'settings':
                        await this.commandHandler.handleHetGeluidSettingsCommand(interaction);
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
    async sendMessage(message: string|MessagePayload|MessageCreateOptions, channelId = process.env.DISCORD_CHANNEL_ID) {
        if (!channelId) {
            console.error(`Couldn't send message: No channel ID provided`);
            return;
        }
        const channel = this.client.channels.cache.get(channelId) ?? await this.client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
            console.error(`Couldn't send message: Channel with ID ${channelId} not found`);
            return;
        }

        return await channel.send(message);
    }

    isNightTime() {
        const now = getNowDate();
        const hour = now.getHours();
        return hour >= 3 && hour < 6;
    }

}
