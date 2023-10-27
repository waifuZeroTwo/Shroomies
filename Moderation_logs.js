const { MongoClient } = require("mongodb");
const uri = process.env.MONGO_URI; // Replace with your MongoDB Atlas URI

const mongoClient = new MongoClient(uri);
let db;

// Initialize MongoDB Connection
mongoClient.connect()
    .then(client => {
        db = client.db('Discord-Bot-DB'); // Replace with your database name
        console.log("Connected to MongoDB Atlas for Moderation Logs");
    })
    .catch(err => console.error("Failed to connect to MongoDB Atlas:", err));

module.exports = {
    logMute: async function(memberId, muteEndTime, reason) {
        const collection = db.collection('moderation_logs'); // Replace with your collection name
        const log = {
            memberId,
            actionType: 'mute',
            actionTimestamp: new Date(),
            duration: (muteEndTime - Date.now()) / 1000,
            reason
        };
        await collection.insertOne(log);
    },

    getRemainingMuteTime: async function(memberId) {
        const collection = db.collection('moderation_logs'); // Replace with your collection name
        const result = await collection.find({
            memberId,
            actionType: 'mute'
        }).sort({ actionTimestamp: -1 }).limit(1).toArray();

        if (result.length > 0) {
            const record = result[0];
            const muteEndTime = record.actionTimestamp.getTime() + (record.duration * 1000);
            return muteEndTime - Date.now();
        }
        return null; // No mute record found
    }
};
