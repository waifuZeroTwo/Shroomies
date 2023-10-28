const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

async function purge(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return message.reply("I'm sorry, you don't have the required permissions to purge messages.");
    }
    const deleteCount = parseInt(args[0], 10);

    if (!deleteCount || deleteCount < 1 || deleteCount >= 100) {
        const embed = new EmbedBuilder()
            .setTitle('Purge Command Error')
            .setDescription("Please provide a number between 1 and 100 for the number of messages to delete.")
            .setColor('#ff0000')
            .setTimestamp();

        return message.channel.send({ embeds: [embed] })
            .then(sentMessage => {
                setTimeout(() => {
                    sentMessage.delete().catch(error => console.log("Failed to delete message:", error));
                }, 2000); // Delete after 2 seconds
            });
    }

    try {
        const fetched = await message.channel.messages.fetch({ limit: deleteCount + 1 });
        const deletedMessages = await message.channel.bulkDelete(fetched);

        const actualDeletedCount = deletedMessages.size - 1;

        const embed = new EmbedBuilder()
            .setTitle('Purge Command Executed')
            .setDescription(`${actualDeletedCount} messages have been deleted.`)
            .setColor('#0099ff')
            .setTimestamp();

        const sentMessage = await message.channel.send({ embeds: [embed] });
        setTimeout(() => {
            sentMessage.delete().catch(error => console.log("Failed to delete message:", error));
        }, 1000);

    } catch (error) {
        console.log("Bulk delete failed:", error);
    }
}

module.exports = {
    purge
};
