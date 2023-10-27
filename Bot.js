let isConnected = false;
require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    Partials,
} = require("discord.js");
const { handleDM } = require("./utils/dmHandler");
const Moderation = require("./prefix_commands/Moderation");
const Purge = require('./prefix_commands/purge');
const BanMuteCheck = require('./prefix_commands/ban_mute_check');
const { connectToMongo } = require('./database/dbConnection');

let db;

// Initialize MongoDB Connection
connectToMongo()
    .then((database) => {
        db = database;
        console.log('Successfully connected to MongoDB Atlas.');
        // Initialize the bot here
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

    const prefix = "."; // Define your command prefix here
    console.log(Moderation);

    client.once("ready", () => {
        console.log("Bot is online!");
    });

    client.on('messageCreate', async (message) => {
        if (!message.content.startsWith(prefix) || message.author.bot) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase();

        if (message.author.bot) return;

        if (message && message.channel && message.channel.type === 1) {
            await handleDM(message, client);
        }

        if (message.channel.name && message.channel.name.startsWith("modmail-")) {
            // DMForHelp.replyToModMail(message, client, modmailThreads);
        }

        if (!message.content.startsWith(prefix)) return;

        console.log('Parsed command:', command);
        switch (command) {
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

    client.login(process.env.DISCORD_TOKEN);
}