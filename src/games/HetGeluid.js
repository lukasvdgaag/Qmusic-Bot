const axios = require('axios');
const HetGeluidAttempt = require("./objects/HetGeluidAttempt");
const HetGeluidInformation = require("./objects/HetGeluidInformation");
const SignUpMoment = require("./objects/SignUpMoment");

class HetGeluid {

    /**
     * @type {DiscordBot}
     */
    #discordBot;

    constructor(discordBot) {
        this.#discordBot = discordBot;

        this.#init();
    }

    async #init() {
        // TODO check if the game is currently active
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
     * @returns {Promise<HetGeluidAttempt[]|*[]>}
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
            const signUpMoment = signUpMoment ?? await this.getCurrentSignUpMoment();
            if (!signUpMoment) return false;

            const {data} = await axios.get(`https://api.qmusic.nl/2.9/app/sign_up_moments/${signUpMoment.id}/sign_up`, {
                'Authorization': `Bearer ${account.token}`
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
    async subscribeUser(username) {
        const account = this.#discordBot.authBank.getUser(username);
        if (!account) return false;

        try {
            const signUpMoment = await this.getCurrentSignUpMoment();

            if (!await this.hasUserSubscribed(username, signUpMoment)) return false;

            const response = await axios.post(`https://api.qmusic.nl/2.9/app/sign_up_moments/${signUpMoment.id}/sign_up`, {
                code: "geluid"
            }, {
                headers: {
                    'Authorization': `Bearer ${account.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200 || response.status === 201) return signUpMoment;
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
        try {
            const {data} = await axios.get('https://api.qmusic.nl/2.9/app/sign_up_moments/current');

            if (!data?.current_moment) return undefined;

            return SignUpMoment.fromData(data);
        } catch (e) {
            return undefined;
        }
    }

}

module.exports = HetGeluid;