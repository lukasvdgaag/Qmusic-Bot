class SignUpMoment {

    /**
     * @type {number}
     */
    id;
    /**
     * @type {Date}
     */
    visibleAt;
    /**
     * @type {Date}
     */
    hiddenAt;

    constructor(id, visibleAt, hiddenAt) {
        this.id = id;
        this.visibleAt = new Date(visibleAt);
        this.hiddenAt = new Date(hiddenAt);
    }

    /**
     *
     * @param data
     * @returns {SignUpMoment}
     */
    static fromData(data) {
        return new SignUpMoment(data.current_moment.id, data.current_moment.visibleAt, data.current_moment.hiddenAt);
    }

}

module.exports = SignUpMoment;