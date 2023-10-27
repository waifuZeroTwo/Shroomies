module.exports.msToHumanReadable = (ms) => {
    let seconds = Math.floor((ms / 1000) % 60);
    let minutes = Math.floor((ms / (1000 * 60)) % 60);
    let hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    let days = Math.floor(ms / (1000 * 60 * 60 * 24));

    let str = '';
    if (days) str += days + ' days ';
    if (hours) str += hours + ' hours ';
    if (minutes) str += minutes + ' minutes ';
    if (seconds) str += seconds + ' seconds';

    return str;
};