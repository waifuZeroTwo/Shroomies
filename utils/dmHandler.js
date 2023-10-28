const { EmbedBuilder } = require('discord.js');
const { openTickets } = require('./common.js');
const { PermissionsBitField } = require('discord.js');

module.exports.handleDM = async function(message, client) {
    try {
        if (message.channel.type === 1) { // Check for DM channel

            // Check if the user already has an open ticket
            if (openTickets.has(message.author.id)) {
                const ticketChannel = openTickets.get(message.author.id);

                // Create an embed message
                const userEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`${message.author.username}#${message.author.discriminator} (${message.author.id})`)
                    .setThumbnail(message.author.displayAvatarURL())
                    .setDescription(`**User Message:**\n${message.content}`)
                    .setTimestamp();

                // Check if the message has any attachments
                if (message.attachments.size > 0) {
                    // Get the URL of the first attachment
                    const attachmentURL = message.attachments.first().url;
                    // Add it as an image to the embed
                    userEmbed.setImage(attachmentURL);
                }

                // Send the embed to the ticket channel
                ticketChannel.send({embeds: [userEmbed]});
                return;
            }

            // Only send the confirmation embed if the user doesn't have an open ticket
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Ticket Confirmation')
                .setDescription('Do you want to confirm the ticket?')
                .setTimestamp();

            const sentEmbed = await message.channel.send({embeds: [embed]});

            await sentEmbed.react('✅');
            await sentEmbed.react('❌');

            const filter = (reaction, user) => {
                return ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
            };
            try {
                // Check if the user already has an open ticket
                if (openTickets.has(message.author.id)) {
                    const ticketChannel = openTickets.get(message.author.id);
                    // Create and send an embed message to the ticket channel
                    const userEmbed = new EmbedBuilder()
                        .setColor('#0099ff')  // You can set any color you like
                        .setTitle(`${message.author.username}#${message.author.discriminator} (${message.author.id})`)
                        .setThumbnail(message.author.displayAvatarURL())
                        .setDescription(`**User Message:**\n${message.content}`)
                        .setTimestamp();
                    ticketChannel.send({embeds: [userEmbed]});
                    return;
                }

                const collector = sentEmbed.createReactionCollector({filter, time: 60000});
                const lastTicketClosure = {};
                collector.on('collect', async (reaction, user) => {
                    if (reaction.emoji.name === '✅') {

                        const lastClosure = lastTicketClosure[message.author.id];
                        const now = Date.now();
                        const delay = 5000;  // 5 seconds delay
                        if (lastClosure && now - lastClosure < delay) {
                            const waitTime = delay - (now - lastClosure);
                            console.log(`Waiting for ${waitTime} ms before creating a new ticket.`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                        }
                        lastTicketClosure[message.author.id] = Date.now();  // Corrected line
                        await message.channel.send('Ticket confirmed.');

                        const guild = client.guilds.cache.get('1165456303209054208'); // Replace with your Guild ID
                        if (guild) {
                            // Count existing ticket channels to name the new one uniquely
                            const existingTicketChannels = guild.channels.cache.filter(channel => channel.name.startsWith('ticket-'));
                            console.log("Existing ticket channels:", existingTicketChannels); // Debugging log
                            const newTicketNumber = existingTicketChannels.size + 1;
                            console.log("New ticket number:", newTicketNumber); // Debugging log

                            const newChannelName = `ticket-${newTicketNumber}`;
                            console.log("New channel name:", newChannelName); // Debugging log

                            try {
                                const channelOptions = {
                                    name: newChannelName,
                                    type: 0,  // 0 stands for a guild text channel
                                    permissionOverwrites: [
                                        {
                                            id: guild.roles.everyone,  // deny access for everyone
                                            deny: [PermissionsBitField.Flags.ViewChannel],
                                        },
                                        {
                                            id: '1165631460330459197',  // allow access for a specific role
                                            allow: [PermissionsBitField.Flags.ViewChannel],
                                        },
                                        {
                                            id: '1165627616003366922',  // allow access for a specific role
                                            allow: [PermissionsBitField.Flags.ViewChannel],
                                        },
                                        {
                                            id: '1165627470653952031',  // allow access for a specific role
                                            allow: [PermissionsBitField.Flags.ViewChannel],
                                        },
                                        {
                                            id: '1165627470653952031',  // allow access for a specific role
                                            allow: [PermissionsBitField.Flags.ViewChannel],
                                        },
                                        {
                                            id: '1165627310783877140',  // allow access for a specific role
                                            allow: [PermissionsBitField.Flags.ViewChannel],
                                        }
                                    ],
                                };

                                const newChannel = await guild.channels.create(channelOptions);
                                await newChannel.setTopic(`User ID: ${message.author.id}`);
                                console.log(`Created new channel ${newChannel.name}`);

                                // Move this line here, after newChannel is defined
                                openTickets.set(message.author.id, newChannel);

                                // Send the original message to the new channel
                                // Create a new embed
                                const userEmbed = new EmbedBuilder()
                                    .setColor('#0099ff')  // You can set any color you like
                                    .setTitle(`${message.author.username}#${message.author.discriminator} (${message.author.id})`)
                                    .setThumbnail(message.author.displayAvatarURL())
                                    .setDescription(`**User Message:**\n${message.content}`)
                                    .setTimestamp();

// Check if the message has any attachments
                                if (message.attachments.size > 0) {
                                    // Get the URL of the first attachment
                                    const attachmentURL = message.attachments.first().url;
                                    // Add it as an image to the embed
                                    userEmbed.setImage(attachmentURL);
                                }


// Send the embed to the new channel
                                newChannel.send({embeds: [userEmbed]}).catch(console.error);

                                console.log("Original Message:", message.content);

                            } catch (error) {
                                console.error('Error creating channel:', error);
                            }

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
            } catch (error) {}
        }
    } catch (error) {
        console.log(`An error occurred: ${error}`);
    }
};