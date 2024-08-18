class HetGeluidInformation {

    /**
     * @type {number}
     */
    amount;
    /**
     * @type {string|null}
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
     * @returns {string|null}
     */
    getAudioName() {
        return !this.audio ? null : this.audio.split('/').pop();
    }

}

module.exports = HetGeluidInformation;