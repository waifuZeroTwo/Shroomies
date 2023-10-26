const { qldbDriver } = require('./aws-config');

const ms = require('ms');
const aws = require('aws-sdk');
require('dotenv').config();
const { PooledQldbDriver } = require("amazon-qldb-driver-nodejs");
const ModerationLogs = require('./Moderation_Logs');
const { EmbedBuilder } = require('discord.js');  // Replace with the correct import statement for EmbedBuilder

async function sendCommand(command) {
  const session = await qldbDriver.getSession();
  const result = await session.executeStatement(command);
  session.close();
  return result;
}

async function checkMuteStatus(memberId) {
    try {
      const session = await qldbDriver.getSession();
      const statement = `SELECT UnmuteTime FROM Moderation_Logs WHERE MemberId = ? AND ActionType = 'mute' AND UnmuteTime > ?`;
      const parameters = [memberId, Date.now()];
      const result = await session.executeStatement(statement, parameters);
      session.close();
    
      if (result.getResultList().length > 0) {
        const unmuteTime = result.getResultList()[0].UnmuteTime;  // Adjust this line to match your schema
        return unmuteTime - Date.now();
      }
    } catch (error) {
      console.error("Error in checkMuteStatus:", error);
    }
    
    return null;
  }  

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
        message.channel.send(`User with ID ${userId} has been unbanned for ${reason}`);
    },

    // Mute a member in the channel
// Mute a member in the channel
    mute: async function(message) {
        const args = message.content.split(' ');
        const memberId = args[1];
        const timeoutArg = args[2];
        const reason = args.slice(3).join(' ');
        const remainingMuteDuration = await checkMuteStatus(memberId);
        const ms = require('ms');
        const duration = ms(ms(timeoutArg), { long: true });  // Declare duration here

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

        if (remainingMuteDuration !== null) {
            const humanReadableRemainingDuration = ms(remainingMuteDuration, { long: true });
            const muteEmbed = new EmbedBuilder()
                .setTitle('Member Already Muted')
                .setDescription(`${member} is already muted.`)
                .setFooter({ text: `${member} was muted for ${reason} and will be unmuted in ${humanReadableRemainingDuration}` })
                .setColor('#FF0000')
                .setTimestamp();
            message.channel.send({ embeds: [muteEmbed] });
            return;
        }

        await member.roles.add(role, reason);

// Log the mute action
        ModerationLogs.logAction('mute', member, reason, duration);

        const muteEmbed = new EmbedBuilder()
            .setTitle('Member Muted')
            .setDescription(`${member} has been muted for ${reason} and will be unmuted in ${duration}`)  // Use duration here
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