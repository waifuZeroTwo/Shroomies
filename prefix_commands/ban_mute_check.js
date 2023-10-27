const { msToHumanReadable } = require('../utils/timeUtils');
const { EmbedBuilder } = require('discord.js'); // Changed from EmbedBuilder to MessageEmbed

async function checkMuteOrBan(message, args, action, db) {
    const memberId = args[0];

    if (!memberId) {
        return message.reply("Please provide a member ID.");
    }

    const collection = db.collection('moderation_logs');
    console.log(`Searching for record with memberId = ${memberId} and actionType = ${action}`);
    const doc = await collection.findOne({ memberId: memberId, actionType: action });
    console.log("Query result:", doc);

    if (!doc) {
        return message.reply(`No ${action} record found for this member.`);
    }

    const currentTime = new Date().getTime();
    console.log("Current Time (ms):", currentTime);

    const actionTimestamp = new Date(doc.actionTimestamp).getTime(); // convert to timestamp (ms)
    console.log("Action Timestamp (ms):", actionTimestamp);

    const durationInMilliseconds = doc.duration * 1000; // if your duration is actually in seconds, convert it to milliseconds
    console.log("Duration (ms):", durationInMilliseconds);

    const endOfAction = actionTimestamp + durationInMilliseconds;
    console.log("End of Action (ms):", endOfAction);

    const remainingTime = endOfAction - currentTime;
    console.log("Remaining Time (ms):", remainingTime);

    if (isNaN(remainingTime)) {
        return message.reply(`The duration for this ${action} is not set.`);
    }

    if (remainingTime <= 0) {
        return message.reply(`The ${action} for this member has expired.`);
    }

    const remainingTimeString = msToHumanReadable(remainingTime);

    // Create an embedded message using MessageEmbed
    const embed = new EmbedBuilder() // Changed from EmbedBuilder to MessageEmbed
        .setTitle(`Check ${action}`)
        .setDescription(`Time remaining for ${action}: ${remainingTimeString}`)
        .setColor('#0099ff')
        .setTimestamp();

    message.channel.send({ embeds: [embed] });
}

module.exports.checkMuteOrBan = checkMuteOrBan;
