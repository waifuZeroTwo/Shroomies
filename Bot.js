let isConnected = false;
require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    Partials,
    Constants,
} = require("discord.js");
const { handleDM } = require("./utils/dmHandler");
const Moderation = require("./prefix_commands/Moderation");
const Purge = require('./prefix_commands/purge');
const BanMuteCheck = require('./prefix_commands/ban_mute_check');
const { MongoClient } = require("mongodb");
const { EmbedBuilder } = require('discord.js');
const uri = process.env.MONGO_URI;
const mongoClient = new MongoClient(uri);
const { openTickets } = require('./utils/common.js');

let db;

// Initialize MongoDB Connection
mongoClient.connect()
    .then(() => {
        db = mongoClient.db('Discord-Bot-DB');
        console.log('Successfully connected to MongoDB Atlas.');
        initializeBot();
    })
    .catch((err) => {
        console.error('Failed to connect to MongoDB Atlas:', err);
    });

function initializeBot() {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildMessageTyping,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.DirectMessageReactions,
            GatewayIntentBits.DirectMessageTyping,
            GatewayIntentBits.MessageContent
        ],
        partials: [
            Partials.User,
            Partials.Message,
            Partials.Channel,
            Partials.GuildMember,
            Partials.Reaction,
        ],
    });

    const prefix = ".";

    client.once("ready", () => {
        console.log("Bot is online!");
    });

    client.on("messageCreate", async (message) => {
        console.log(`Received message: ${message.content} from ${message.author.tag}`);

        if (message.author.bot) return;

        if (message && message.channel && message.channel.type === 1) {
            await handleDM(message, client);
        }

        // Forward messages from ticket channels to user's DMs
        if (message.channel.name && message.channel.name.startsWith('ticket-')) {
            // New: Check if this is an open ticket
            const topic = message.channel.topic;
            const userId = topic ? topic.replace('User ID: ', '') : null;

            if (!userId || !openTickets.has(userId)) return;

            const user = await client.users.fetch(userId).catch(console.error);
            if (!user) return;

            // Create a new embed for the support message
            const supportEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setAuthor({
                    name: message.author.tag,
                    iconURL: message.author.displayAvatarURL(),
                    url: `https://discord.com/users/${message.author.id}`
                })
                .setDescription(`**Support Message:**\n${message.content}`)
                .setTimestamp()
                .setFooter({
                    text: `Sent by support user ${message.author.tag}`
                });

            // Check if the message has any attachments
            if (message.attachments.size > 0) {
                // Get the URL of the first attachment
                const attachmentURL = message.attachments.first().url;
                // Add it as an image to the embed
                supportEmbed.setImage(attachmentURL);
            }

            // Send the embed to the user's DMs
            user.send({ embeds: [supportEmbed] }).catch(console.error);
        }

        // Additional code for handling .close command
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase();

        switch (command) {
            case 'close':
                await closeTicket(message, args);
                break;
            case "kick":
                await Moderation.kick(message);
                break;
            case "ban":
                await Moderation.ban(message);
                break;
            case "unban":
                await Moderation.unban(message);
                break;
            case "mute":
                await Moderation.mute(message);
                break;
            case "unmute":
                await Moderation.unmute(message);
                break;
            case 'purge':
                await Purge.purge(message, args);
                break;
            case 'checkmute':
                await BanMuteCheck.checkMuteOrBan(message, args, 'mute', db);
                break;
            case 'checkban':
                await BanMuteCheck.checkMuteOrBan(message, args, 'ban', db);
                break;
        }
    });
async function closeTicket(message, args) {
    const ticketNumber = args[0];  // Assumes ticket number is the first argument
    if (!ticketNumber) {
        message.reply('Please specify a ticket number.');
        return;
    }

    const ticketChannelName = `ticket-${ticketNumber}`;
    const ticketChannel = message.guild.channels.cache.find(channel => channel.name === ticketChannelName);
    if (!ticketChannel) {
        message.reply('Ticket not found.');
        return;
    }

    // Assuming the User ID is stored in the channel topic as before
    const userId = ticketChannel.topic ? ticketChannel.topic.replace('User ID: ', '') : null;
    if (!userId) {
        message.reply('User ID not found in ticket channel topic.');
        return;
    }

    if (openTickets.has(userId)) {
        openTickets.delete(userId);  // Remove the ticket from the openTickets map
    }

    // Create an embedded message using EmbedBuilder
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Ticket Closed')
        .setDescription(`Ticket #${ticketNumber} has been closed.`)
        .setTimestamp();

    // Send the embedded message to the user who initiated the ticket
    const user = await message.guild.members.fetch(userId).catch(console.error);
    if (user) {
        await user.send({ embeds: [embed] }).catch(console.error);
    }

    // Wait for 5 seconds before deleting the ticket channel
    setTimeout(async () => {
        try {
            await ticketChannel.delete('Ticket closed.');
        } catch (error) {
            console.error('Error deleting channel:', error);
        }
    }, 5000);
}

    client.login(process.env.DISCORD_TOKEN);
}