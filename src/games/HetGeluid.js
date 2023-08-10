const axios = require('axios');
const HetGeluidAttempt = require("./objects/HetGeluidAttempt");

class HetGeluid {

    /**
     * @type {DiscordBot}
     */
    #discordBot;

    constructor(discordBot) {
        this.#discordBot = discordBot;
    }

    #init() {

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

}

module.exports = HetGeluid;