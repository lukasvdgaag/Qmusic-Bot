class TimeUtils {

    static getNowDate() {
        // get the current date in CEST (utc+2) timezone (Qmusic API uses this timezone)
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        return new Date(utc + (3600000 * 2));
    }

    static getNow() {
        return TimeUtils.getNowDate().getTime();
    }

}

module.exports = TimeUtils;