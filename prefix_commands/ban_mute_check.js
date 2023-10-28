const { msToHumanReadable } = require('../utils/timeUtils');
const { EmbedBuilder, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
async function checkMuteOrBan(message, args, action, db) {
    // Check if the member has the 'MANAGE_MESSAGES' permission
    const member = message.guild.members.cache.get(message.author.id);
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return message.reply("You don't have permission to check ban or mute durations of people");
    }
    const memberId = args[0];

    if (!memberId) {
        return message.reply("Please provide a member ID.");
    }

    const collection = db.collection('moderation_logs');
    console.log(`Searching for record with memberId = ${memberId} and actionType = ${action}`);

    let doc;
    if (action === 'mute') {
        const docs = await collection.find({ memberId: memberId, actionType: action })
            .sort({ actionTimestamp: -1 })
            .limit(1)
            .toArray();
        doc = docs[0];  // Take the most recent document
    } else {
        doc = await collection.findOne({ memberId: memberId, actionType: action });
    }

    console.log("Query result:", doc);

    if (!doc) {
        return message.reply(`No ${action} record found for this member.`);
    }

    const currentTime = new Date().getTime();
    const actionTimestamp = new Date(doc.actionTimestamp).getTime();
    const remainingTime = (actionTimestamp + doc.duration * 1000) - currentTime;  // Updated this line


    if (isNaN(remainingTime)) {
        return message.reply(`The duration for this ${action} is not set.`);
    }

    if (remainingTime <= 0) {
        return message.reply(`The ${action} for this member has expired.`);
    }

    const remainingTimeString = msToHumanReadable(remainingTime);

    const embed = new EmbedBuilder()
        .setTitle(`Check ${action}`)
        .setDescription(`Time remaining for ${action}: ${remainingTimeString}`)
        .setColor('#0099ff')
        .setTimestamp();

    message.channel.send({ embeds: [embed] });
}

module.exports.checkMuteOrBan = checkMuteOrBan;