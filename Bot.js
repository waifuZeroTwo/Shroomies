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

const uri = process.env.MONGO_URI;
const mongoClient = new MongoClient(uri);

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

        if (message.channel.name && message.channel.name.startsWith("modmail-")) {
            // DMForHelp.replyToModMail(message, client, modmailThreads);
        }

        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase();

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