const { EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
    logAction: async function(action, member, reason, duration, guild) {
        // Find the channel where you want to send the moderation logs
        const logChannel = guild.channels.cache.find(channel => channel.name === "Moderation_Logs_Channel");
        
        if (!logChannel) {
            console.warn("Log channel not found!");
            return;
        }

        // Create an embed message
        const embed = new EmbedBuilder()
            .setTitle(`Moderation Action: ${action}`)
            .setDescription(`Member: ${member}\nReason: ${reason}`)
            .setColor('#FF0000')
            .setTimestamp();
        
        // Include duration if it's relevant (e.g., for a mute)
        if (duration) {
            embed.addField('Duration', duration);
        }

        // Send the embed to the log channel
        logChannel.send({ embeds: [embed] });
    },
};