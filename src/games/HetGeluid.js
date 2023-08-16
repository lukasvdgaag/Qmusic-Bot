const axios = require('axios');
const HetGeluidAttempt = require("./objects/HetGeluidAttempt");
const HetGeluidInformation = require("./objects/HetGeluidInformation");
const SignUpMoment = require("./objects/SignUpMoment");
const TimeUtils = require("../utils/TimeUtils");

class HetGeluid {

    /**
     * @type {DiscordBot}
     */
    #discordBot;
    /**
     * @type {SignUpMoment}
     */
    #currentSignupMoment;
    /**
     * @type {number}
     */
    #lastSignUpMomentId;
    /**
     * @type {boolean}
     */
    available;

    constructor(discordBot) {
        this.#discordBot = discordBot;

        this.#init();
    }

    async #init() {
        const info = await this.fetchSoundInfo();
        this.available = !!info;

        if (!this.available) return;

        this.#checkSignUpMoment().catch(console.error);

        // set interval to check if users need to be resubscribed. Check every 5 minutes if the sign-up moment didn't change
        setInterval(async () => {
            await this.#checkSignUpMoment();
        }, 1000 * 60 * 5);
    }

    async #checkSignUpMoment() {
        const moment = await this.getCurrentSignUpMoment();
        if (!moment) return;

        if (this.#lastSignUpMomentId !== moment.id) {
            this.#lastSignUpMomentId = moment.id;

            await Promise.all(
                [...this.#discordBot.authBank.getUsers()]
                    .filter(a => a.settings.het_geluid.auto_signup)
                    .map(a => this.subscribeUser(a.username, true))
            );
        }
    }

    /**
     * Get all the attempts from users for the current sound
     * @returns {Promise<HetGeluidAttempt[] | undefined>}
     */
    async fetchAnswers() {
        try {
            const response = await axios.get('https://api.qmusic.nl/2.7/actions/het-geluid/answers');

            if (response.status !== 200) return undefined;

            const data = response.data?.answers;
            if (!data) return undefined;

            return data.map(answer => HetGeluidAttempt.fromData(answer));
        } catch (e) {
            return undefined;
        }
    }

    /**
     * Find any matching answers for the given input that were already attempted for the current sound
     * @param input
     * @returns {Promise<HetGeluidAttempt[]>}
     */
    async findAnswer(input) {
        if (!input || input.length < 3) return [];

        const answers = await this.fetchAnswers();
        if (!answers) return [];

        return answers.filter(answer => answer.answer.toLowerCase().includes(input.toLowerCase()));
    }

    /**
     * Get the current sound information
     * @returns {Promise<undefined|HetGeluidInformation>}
     */
    async fetchSoundInfo() {
        try {
            const response = await axios.get('https://api.qmusic.nl/2.9/actions/het-geluid/amount');

            if (response.status !== 200) return undefined;

            const data = response.data;
            if (!data) return undefined;

            return HetGeluidInformation.fromData(data);
        } catch (e) {
            return undefined;
        }
    }

    /**
     * Check if the given user has subscribed to the current sign up moment
     * @param {string} username
     * @param {SignUpMoment} signUpMoment
     * @returns {Promise<boolean>}
     */
    async hasUserSubscribed(username, signUpMoment = undefined) {
        const account = this.#discordBot.authBank.getUser(username);
        if (!account) return false;

        try {
            const moment = signUpMoment ?? await this.getCurrentSignUpMoment();
            if (!moment) return false;

            const {data} = await axios.get(`https://api.qmusic.nl/2.9/app/sign_up_moments/${moment.id}/sign_up`, {
                headers: {
                    'Authorization': `Bearer ${account.token}`
                }
            });

            return data?.subscribed;
        } catch (e) {
            return false;
        }
    }

    /**
     * Subscribe the given user to the current sign-up moment.
     * Returns the sign-up moment if successful, false otherwise
     * @param username
     * @returns {Promise<SignUpMoment|false>}
     */
    async subscribeUser(username, sendMessage = false) {
        const account = this.#discordBot.authBank.getUser(username);
        if (!account || !account.token) return false;

        try {
            const signUpMoment = await this.getCurrentSignUpMoment();

            if (await this.hasUserSubscribed(username, signUpMoment)) return false;

            const response = await axios.post(`https://api.qmusic.nl/2.9/app/sign_up_moments/${signUpMoment.id}/sign_up`, {
                code: "geluid"
            }, {
                headers: {
                    'Authorization': `Bearer ${account.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200 || response.status === 201) {
                if (sendMessage) await this.#discordBot.sendMessage(`\`${username}\` is aangemeld voor het geluid van <t:${signUpMoment.hiddenAt.getTime() / 1000}:D>`);
                return signUpMoment;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    /**
     * Get the current sign up moment
     * @returns {Promise<undefined|SignUpMoment>}
     */
    async getCurrentSignUpMoment() {
        const currentTime = TimeUtils.getNow();
        if (this.#currentSignupMoment && this.#currentSignupMoment.hiddenAt > currentTime) return this.#currentSignupMoment;

        try {
            const {data} = await axios.get('https://api.qmusic.nl/2.9/app/sign_up_moments/current');

            if (!data?.current_moment) return undefined;

            this.#currentSignupMoment = SignUpMoment.fromData(data);
            return this.#currentSignupMoment;
        } catch (e) {
            return undefined;
        }
    }

}

module.exports = HetGeluid;