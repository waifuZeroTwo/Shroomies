const { EmbedBuilder } = require('discord.js');

async function purge(message, args) {
    // Parse the number of messages to delete
    const deleteCount = parseInt(args[0], 10);

    // Make sure the number of messages to delete is valid
    if (!deleteCount || deleteCount < 1 || deleteCount > 100) {
        return message.reply("Please provide a number between 1 and 100 for the number of messages to delete.");
    }

    // Fetch the messages and delete them
    const fetched = await message.channel.messages.fetch({ limit: deleteCount + 1 });
    message.channel.bulkDelete(fetched)
        .then(deletedMessages => {
            console.log("Bulk delete successful."); // Debug line

            // Calculate the number of messages actually deleted, discounting the purge command
            const actualDeletedCount = deletedMessages.size - 1;

            // Create an embedded message using EmbedBuilder
            const embed = new EmbedBuilder()
                .setTitle('Purge Command Executed')
                .setDescription(`${actualDeletedCount} messages have been deleted.`)
                .setColor('#0099ff')
                .setTimestamp();

            // Send the embedded message
            message.channel.send({ embeds: [embed] })
                .then(sentMessage => {
                    // Delete the embedded message after 1 second (1000 milliseconds)
                    setTimeout(() => {
                        sentMessage.delete().catch(error => console.log("Failed to delete message:", error));
                    }, 1000);
                });
        })
        .catch(error => {
            console.log("Bulk delete failed:", error); // Debug line
        });
}

module.exports = {
    purge
};