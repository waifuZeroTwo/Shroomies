require('dotenv').config();
const { MongoClient } = require("mongodb");
const ms = require('ms');
const { MessageEmbed, EmbedBuilder} = require('discord.js');  // Corrected the import statement for MessageEmbed
const ModerationLogs = require('./Moderation_Logs');

// Initialize MongoDB Connection
const uri = process.env.MONGO_URI; // Replace with your MongoDB Atlas URI
const mongoClient = new MongoClient(uri);

mongoClient.connect()
    .then(() => console.log("Connected to MongoDB Atlas"))
    .catch(err => console.error("Failed to connect to MongoDB Atlas:", err));
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

module.exports = {
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
        const args = message.content.split(' ');
        const memberId = args[1];
        const timeoutArg = args[2] || '10d';  // Default to 10 days if no duration is provided
        const durationInMs = ms(timeoutArg);  // This should no longer be undefined
        const reason = args.slice(3).join(' ') || 'No reason provided';  // Default reason
        const duration = ms(timeoutArg, { long: true });


        let member = message.mentions.members.first();
        if (!member) {
            try {
                member = await message.guild.members.fetch(memberId);
            } catch (err) {
                console.error(err);
            }
        }

        if (!member) {
            message.channel.send('Invalid arguments. Usage: .ban <member/ID> [duration] [reason]');
            return;
        }

        // Check if the member is already banned
        const isBanned = await ModerationLogs.isBanned(member.id);
        console.log(`Checked if member ${member.id} is banned: ${isBanned}`);  // Debug line
        if (isBanned) {
            const banEmbed = new EmbedBuilder()
                .setTitle('Member Already Banned')
                .setDescription(`Kindly note, ${member} is already banned.`)
                .setColor('#FF0000')
                .setTimestamp();
            message.channel.send({ embeds: [banEmbed] });
            return;
        }

        // Log the ban action with a duration
        const banEndTime = Date.now() + ms(timeoutArg);
        await ModerationLogs.logBan(member.id, banEndTime, reason);

        const banEmbed = new EmbedBuilder()
            .setTitle('Member Banned')
            .setDescription(`${member} has been banned for ${reason} and will be unbanned in ${duration}`)
            .setColor('#FF0000')
            .setTimestamp();
        message.channel.send({ embeds: [banEmbed] });

        // Send a DM to the banned member
// Send a DM to the banned member
        const dmEmbed = new EmbedBuilder()
            .setTitle('You Have Been Banned')
            .setDescription(`You have been banned from ${message.guild.name} for ${duration}`)
            .addFields('Reason', reason)
            .setColor('#FF0000')
            .setTimestamp();
        try {
            await member.send({ embeds: [dmEmbed] });
        } catch (err) {
            console.error('Could not send DM to the banned member:', err);
            message.channel.send(`Could not send DM to ${member}. They might have DMs disabled for this server or have the bot blocked.`);
        }

// Now ban the member
        await member.ban({reason: reason});

        // Optionally, schedule an unban using setTimeout
        setTimeout(async () => {
            await message.guild.members.unban(member.id, 'Ban duration expired');
            await ModerationLogs.removeBan(member.id);  // Remove the ban record from the database
        }, ms(timeoutArg));
    },
    // Unban a previously banned member
    unban: async function (message) {
        const args = message.content.split(' ');
        const userId = args[1];
        const reason = args.slice(2).join(' ');

        if (!userId || !reason) {
            message.channel.send('Invalid arguments. Usage: .unban <userID> <reason>');
            return;
        }

        try {
            await message.guild.members.unban(userId, reason);
            await ModerationLogs.removeBan(userId);  // Remove the ban record from the database
            message.channel.send(`User with ID ${userId} has been unbanned for ${reason}`);
        } catch (err) {
            if (err.code === 10026) {
                message.channel.send(`User with ID ${userId} is not banned.`);
            } else {
                console.error('An error occurred while unbanning:', err);
                message.channel.send('An error occurred while trying to unban the user.');
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
        const ms = require('ms');
        const duration = ms(ms(timeoutArg), {long: true});

        let member = message.mentions.members.first();
        if (!member) {
            try {
                member = await message.guild.members.fetch(memberId);
            } catch (err) {
                console.error(err);
            }
        }

        if (!member || !reason || !timeoutArg) {
            message.channel.send('Invalid arguments. Usage: .mute <member/ID> <timeout> <reason>');
            return;
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
            .setDescription(`${member} has been muted for ${reason} and will be unmuted in ${duration}`)
            .setColor('#FF0000')
            .setTimestamp();
        message.channel.send({ embeds: [muteEmbed] });

// Send a DM to the muted member
        const dmEmbed = new EmbedBuilder()
            .setTitle('You Have Been Muted')
            .setDescription(`You have been muted in ${message.guild.name} for ${duration}`)
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