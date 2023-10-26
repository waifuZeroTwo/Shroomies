const { EmbedBuilder } = require('discord.js');
const { qldbClient } = require('./aws-config');

module.exports.handleDM = async function(message, client) {
    try {
        if (message.channel.type === 1) {  
            const embed = new EmbedBuilder()
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

                    const guild = client.guilds.cache.get('1165456303209054208'); 
                    if (guild) {
                        guild.channels.create('new-channel', {
                            type: 'GUILD_TEXT',
                            name: 'test'
                          }).then(channel => {
                            console.log(`Created new channel ${channel.name}`);
                          })                        
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
