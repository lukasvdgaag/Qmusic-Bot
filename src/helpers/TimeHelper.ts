export const getNowDate = () => {
    // get the current date in CEST (utc+2) timezone (Qmusic API uses this timezone)
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 2));
}

export const getNow = () => {
    return getNowDate().getTime();
}

export const isNextDay = (date?: Date) => {
    if (!date) return true;
    const today = getNowDate();

    return today.getFullYear() !== date.getFullYear() ||
        today.getMonth() !== date.getMonth() ||
        today.getDate() !== date.getDate();
}