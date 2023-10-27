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
    // Ban a member from the guild
    ban: async function (message) {
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
            message.channel.send('Invalid arguments. Usage: .ban <member/ID> <reason>');
            return;
        }

        await member.ban({reason: reason});
        logAction('ban', member, reason); // Log the action
        message.channel.send(`${member} has been banned for ${reason}`);
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

        await message.guild.members.unban(userId, reason);
        logAction('unban', { id: userId }, reason); // Log the action
        message.channel.send(`User with ID ${userId} has been unbanned for ${reason}`);
    },

    // Mute a member in the channel
// Mute a member in the channel
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