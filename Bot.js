const { qldbDriver } = require('./aws-config');
require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    Constants,
} = require("discord.js");
const { handleDM } = require("./dmHandler");
const Moderation = require("./Moderation");
const { qldbClient } = require('./aws-config');
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

client.once("ready", () => {
    console.log("Bot is online!");
});

// New event handler for messageCreate
client.on("messageCreate", async (message) => {
    console.log(
        `Received message: ${message.content} from ${message.author.tag}`
    );

    if (message.author.bot) return;

    if (message && message.channel && message.channel.type === 1) {
        // <-- Change is here
        await handleDM(message, client);
    }

    if (message.channel.name && message.channel.name.startsWith("modmail-")) {
        // DMForHelp.replyToModMail(message, client, modmailThreads);
    }

    // Check for the prefix and ignore messages without the prefix
    if (!message.content.startsWith(prefix)) return;

    // Process the command
    const command = message.content.slice(prefix.length).trim().split(" ")[0];

    console.log('Parsed command:', command);
    switch (command) {
        case "kick":
            console.log('Before kick command execution');
            await Moderation.kick(message);
            console.log('After kick command execution');
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
    }
});

// Remember to log in with your token
client.login(process.env.DISCORD_TOKEN);
