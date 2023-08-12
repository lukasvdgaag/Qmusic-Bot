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

    /**
     * Get the name of the audio file
     * @returns {string}
     */
    getAudioName() {
        return this.audio.split('/').pop();
    }

}

module.exports = HetGeluidInformation;