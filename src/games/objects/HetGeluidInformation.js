class HetGeluidInformation {

    /**
     * @type {number}
     */
    amount;
    /**
     * @type {string}
     */
    audio;

    constructor(amount, audio) {
        this.amount = amount;
        this.audio = audio;
    }

    /**
     *
     * @param data
     * @returns {HetGeluidInformation}
     */
    static fromData(data) {
        return new HetGeluidInformation(data.amount, data.audio);
    }

}

module.exports = HetGeluidInformation;