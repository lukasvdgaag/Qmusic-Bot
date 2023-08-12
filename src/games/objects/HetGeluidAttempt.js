class HetGeluidAttempt {

    /**
     * @type {string}
     */
    answer;
    /**
     * @type {string}
     */
    name;
    /**
     * @type {string}
     */
    location;
    /**
     * @type {Date}
     */
    guessed_at;

    constructor(answer, name, location, guessed_at) {
        this.answer = answer;
        this.name = name;
        this.location = location;
        this.guessed_at = new Date(guessed_at);
    }

    /**
     *
     * @param data
     * @returns {HetGeluidAttempt}
     */
    static fromData(data) {
        return new HetGeluidAttempt(data.answer, data.name, data.location, data.guessed_at);
    }

}

module.exports = HetGeluidAttempt;