const ms = require('ms');
const { EmbedBuilder } = require('discord.js'); // Note: EmbedBuilder seems to be specific to your codebase, replace as needed
const ModerationLogs = require('../database/Moderation_logs'); // Adjust the path according to your directory structure
const { msToHumanReadable } = require('../utils/timeUtils'); // Adjust the path according to your directory structure

let mongoClient;

// Initialization function
const init = async (client, isConnected) => {
    mongoClient = client;
    if (isConnected) {
        console.log('MongoDB Connected for Moderation Module');
    } else {
        console.error('MongoDB not connected for Moderation Module');
    }
};

const logAction = async (action, member, reason, duration) => {
    const db = mongoClient.db('Discord-Bot-DB'); // Replace with your database name
    const collection = db.collection('moderation_logs'); // Replace with your collection name

    const log = {
        action,
        memberID: member.id,
        reason,
        duration,
        timestamp: new Date()
    };

    await collection.insertOne(log);
};

// Export the init function and any other functions that you need
module.exports = {
    init, // Initialization function
    logAction, // Your logAction function
    // Kick a member from the guild

    kick: async function (message) {
        console.log('Module is being loaded');
        const args = message.content.split(' ');
        const memberId = args[1];  // Can be either a mention or a user ID
        const reason = args.slice(2).join(' ');

        // Try to find the member from mentions first, then by fetching
        let member = message.mentions.members.first();
        if (!member) {
            try {
                member = await message.guild.members.fetch(memberId);
            } catch (err) {
                console.error(err);
            }
        }

        if (!member || !reason) {
            message.channel.send('Invalid arguments. Usage: .kick <member/ID> <reason>');
            return;
        }

        await member.kick(reason);
        logAction('kick', member, reason); // Log the action
        message.channel.send(`${member} has been kicked for ${reason}`);
    },

    ban: async function (message) {
        try {
            const args = message.content.split(' ');
            const memberId = args[1];
            const timeoutArg = args[2]; // Could be either a timeout or a reason
            const reasonArg = args.slice(3).join(' ');

            // Fetch member first
            let member = message.mentions.members.first();
            if (!member) {
                try {
                    member = await message.guild.members.fetch(memberId);
                } catch (err) {
                    console.error("Error fetching member:", err);
                    return;
                }
            }
            if (!member) {
                message.channel.send('Invalid arguments. Usage: .ban <member/ID> [duration] [reason]');
                return;
            }

// Initialize your variables
            let reason;
            let durationInMs = ms('10d'); // default value
            let duration = msToHumanReadable(durationInMs); // Initialize duration here
            let banEndTime = Date.now() + durationInMs; // default value

            if (ms(timeoutArg)) {
                durationInMs = ms(timeoutArg);
                duration = msToHumanReadable(durationInMs); // Initialize duration here
                banEndTime = Date.now() + durationInMs;
                reason = reasonArg || 'No reason provided';
            } else {
                reason = [timeoutArg, reasonArg].join(' ').trim();
            }

            // First, check if the user is already banned
            const isBanned = await ModerationLogs.isBanned(member.id);

            if (isBanned) {
                // Fetch the ban end time
                const banEndTime = await ModerationLogs.getBanEndTime(member.id);
                // Calculate the remaining time
                const remainingTimeMs = banEndTime - Date.now();
                // Convert to human-readable format
                const remainingTimeStr = msToHumanReadable(remainingTimeMs);

                const banEmbed = new EmbedBuilder()
                    .setTitle('Member Already Banned')
                    .setDescription(`Kindly note, ${member} is already banned.`)
                    .setColor('#FF0000')
                    .setTimestamp()
                    .setFooter(`Will be unbanned in ${remainingTimeStr}`);  // Show remaining time in footer

                message.channel.send({ embeds: [banEmbed] });
                return;
            }

            // If not already banned, then proceed with the ban
            console.log('Debug:', member.id, banEndTime, reason);
            console.log('Type Debug:', typeof banEndTime, typeof durationInMs);
            await ModerationLogs.logBan(member.id, banEndTime, reason);


            const banEmbed = new EmbedBuilder()
                .setTitle('Member Banned')
                .setDescription(`${member} has been banned for ${reason} and will be unbanned in ${duration}`)
                .setColor('#FF0000')
                .setTimestamp();

            message.channel.send({ embeds: [banEmbed] });

// Rest of your code

            const dmEmbed = new EmbedBuilder()
                .setTitle('You Have Been Banned')
                .setDescription(`You have been banned from ${message.guild.name} for ${duration}`)
                .addFields({ name: 'Reason', value: reason })
                .setColor('#FF0000')
                .setTimestamp();

            try {
                await member.send({ embeds: [dmEmbed] });
            } catch (err) {
                console.error('Could not send DM to the banned member:', err);
                message.channel.send(`Could not send DM to ${member}. They might have DMs disabled for this server or have the bot blocked.`);
            }

            await member.ban({ reason: reason });

            if (durationInMs && durationInMs > 0) {
                setTimeout(async () => {
                    await message.guild.members.unban(member.id, 'Ban duration expired');
                    await ModerationLogs.removeBan(member.id);
                }, durationInMs);
            }
        } catch (err) {
            console.error("An unexpected error occurred:", err);
        }
    },

    // Unban a previously banned member
    unban: async function (message) {
        const args = message.content.split(' ');
        const userId = args[1];
        const reason = args.slice(2).join(' ');

        if (!userId || !reason) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('Invalid Arguments')
                .setDescription('Usage: .unban <userID> <reason>')
                .setColor('#FF0000')
                .setTimestamp();
            message.channel.send({ embeds: [errorEmbed] });
            return;
        }

        try {
            await message.guild.members.unban(userId, reason);
            await ModerationLogs.removeBan(userId);  // Remove the ban record from the database

            const unbanEmbed = new EmbedBuilder()
                .setTitle('Member Unbanned')
                .setDescription(`User with ID ${userId} has been unbanned.`)
                .addFields({ name: 'Reason', value: reason })  // Changed to addFields
                .setColor('#00FF00')  // Green color to indicate success
                .setTimestamp();
            message.channel.send({ embeds: [unbanEmbed] });

        } catch (err) {
            if (err.code === 10026) {
                const notBannedEmbed = new EmbedBuilder()
                    .setTitle('Not Banned')
                    .setDescription(`User with ID ${userId} is not banned.`)
                    .setColor('#FFFF00')  // Yellow color to indicate warning
                    .setTimestamp();
                message.channel.send({ embeds: [notBannedEmbed] });
            } else {
                console.error('An error occurred while unbanning:', err);
                const errorEmbed = new EmbedBuilder()
                    .setTitle('Error')
                    .setDescription('An error occurred while trying to unban the user.')
                    .setColor('#FF0000')
                    .setTimestamp();
                message.channel.send({ embeds: [errorEmbed] });
            }
        }
    },

    // Mute a member in the channel
// Mute a member in the channel
    removeMute: async function(memberId) {
        const collection = db.collection('moderation_logs'); // Replace with your collection name
        await collection.deleteOne({
            memberId,
            actionType: 'mute'
        });
    },
    mute: async function(message) {
        const args = message.content.split(' ');
        const memberId = args[1];
        const timeoutArg = args[2];
        const reason = args.slice(3).join(' ');

        // Check if all required arguments are provided
        if (!memberId || !timeoutArg || !reason) {
            message.channel.send('Invalid arguments. Usage: .mute <member/ID> <timeout> <reason>');
            return;
        }

        // Check if timeoutArg is a valid time string
        const ms = require('ms');
        const duration = ms(timeoutArg, { long: true });
        if (!duration) {
            message.channel.send('Invalid time format for timeout.');
            return;
        }

        let member = message.mentions.members.first();
        if (!member) {
            try {
                member = await message.guild.members.fetch(memberId);
            } catch (err) {
                console.error(err);
            }
        }

        // Check if the member is already muted
        const remainingMuteDuration = await ModerationLogs.getRemainingMuteTime(member.id);
        console.log('Remaining Mute Duration:', remainingMuteDuration);  // Debug log

        if (remainingMuteDuration !== null) {
            if (remainingMuteDuration <= 0) {
                // Mute has expired, remove the record
                await ModerationLogs.removeMute(member.id);
            } else {
                const humanReadableRemainingDuration = ms(remainingMuteDuration, { long: true });
                const muteEmbed = new EmbedBuilder()
                    .setTitle('Member Already Muted')
                    .setDescription(`Kindly note, ${member} is already muted.`)
                    .setFooter({ text: `The mute will remain in effect for ${humanReadableRemainingDuration}`, iconURL: null })
                    .setColor('#FF0000')
                    .setTimestamp();
                message.channel.send({ embeds: [muteEmbed] });
                return;
            }
        }

        const role = message.guild.roles.cache.find(role => role.name === "Muted");
        if (!role) {
            message.channel.send('Mute role not found. Please create a role named "Muted".');
            return;
        }

        // Correctly calculate the mute end time and log the mute action
        const muteEndTime = Date.now() + ms(timeoutArg);
        await ModerationLogs.logMute(member.id, muteEndTime, reason);

        await member.roles.add(role, reason);

        // Remove the call to ModerationLogs.logAction('mute', member, reason, duration);

        const muteEmbed = new EmbedBuilder()
            .setTitle('Member Muted')
            .setDescription(`${member} has been muted for ${reason} and will be unmuted in ${msToHumanReadable(ms(timeoutArg))}`)
            .setColor('#FF0000')
            .setTimestamp();
        message.channel.send({ embeds: [muteEmbed] });

// Send a DM to the muted member
        const dmEmbed = new EmbedBuilder()
            .setTitle('You Have Been Muted')
            .setDescription(`${member} has been muted for ${reason} and will be unmuted in ${timeoutArg}`)
            .addFields({ name: 'Reason', value: reason })
            .setColor('#FF0000')
            .setTimestamp();

// Send the DM
        try {
            await member.send({ embeds: [dmEmbed] });
        } catch (e) {
            console.error('Could not send DM to the member.', e);
        }

        setTimeout(async () => {
            await member.roles.remove(role, 'Mute duration expired');
        }, ms(timeoutArg));  // Convert timeout to milliseconds for setTimeout
    },

    // Unmute a member in the channel
    unmute: async function(message) {
        const args = message.content.split(' ');
        const memberId = args[1];
        const reason = args.slice(2).join(' ');

        let member = message.mentions.members.first();
        if (!member) {
            try {
                member = await message.guild.members.fetch(memberId);
            } catch (err) {
                console.error(err);
            }
        }

        if (!member || !reason) {
            message.channel.send('Invalid arguments. Usage: .unmute <member/ID> <reason>');
            return;
        }

        const role = message.guild.roles.cache.find(role => role.name === "Muted");
        if (!role) {
            message.channel.send('Mute role not found. Please create a role named "Muted".');
            return;
        }

        await member.roles.remove(role, reason);
        message.channel.send(`${member} has been unmuted for ${reason}`);
    }
};