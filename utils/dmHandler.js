const { MessageEmbed } = require('discord.js');
const mongoClient = require('../database/mongoClient'); // Replace with your MongoDB client

// Function to log ticket information to MongoDB
const logTicket = async (ticketInfo) => {
    const db = mongoClient.db('Discord-Bot-DB'); // Replace with your database name
    const collection = db.collection('tickets'); // Replace with your collection name
    await collection.insertOne(ticketInfo);
};

module.exports.handleDM = async function(message, client) {
    try {
        if (message.channel.type === 'dm') {
            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Ticket Confirmation')
                .setDescription('Do you want to confirm the ticket?')
                .setTimestamp();

            const sentEmbed = await message.channel.send({ embeds: [embed] });

            await sentEmbed.react('✅');
            await sentEmbed.react('❌');

            const filter = (reaction, user) => {
                return ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
            };

            const collector = sentEmbed.createReactionCollector({ filter, time: 60000 });

            collector.on('collect', async (reaction, user) => {
                if (reaction.emoji.name === '✅') {
                    await message.channel.send('Ticket confirmed.');

                    // Log ticket to database
                    const ticketInfo = {
                        userID: message.author.id,
                        content: message.content,
                        timestamp: new Date(),
                        // Add more fields as needed
                    };
                    await logTicket(ticketInfo);

                    // Create new channel and send embedded message
                    const guild = client.guilds.cache.get('1165456303209054208');
                    if (guild) {
                        const db = mongoClient.db('Discord-Bot-DB');
                        const ticketNumber = await db.collection('tickets').countDocuments({});
                        const channel = await guild.channels.create(`Ticket#${ticketNumber + 1}`, {
                            type: 'GUILD_TEXT',
                        });

                        const embed = new MessageEmbed()
                            .setColor('#0099ff')
                            .setTitle(`Ticket#${ticketNumber + 1}`)
                            .setDescription(`User ID: ${message.author.id}\nContent: ${message.content}`)
                            .setThumbnail(message.author.displayAvatarURL())
                            .setTimestamp();

                        await channel.send({ embeds: [embed] });
                    } else {
                        console.log("Guild not found.");
                    }
                } else if (reaction.emoji.name === '❌') {
                    await message.channel.send('Ticket cancelled.');
                }

                collector.stop();
            });

            collector.on('end', collected => {
                // No need to remove reactions in DMs
            });
        }
    } catch (error) {
        console.log(`An error occurred: ${error}`);
    }
};
