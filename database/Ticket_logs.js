const { MongoClient } = require("mongodb");
const uri = process.env.MONGO_URI; // Replace with your MongoDB Atlas URI

const mongoClient = new MongoClient(uri);
let db;

// Initialize MongoDB Connection
mongoClient.connect()
    .then(client => {
        db = client.db('Discord-Bot-DB'); // Replace with your database name
        console.log("Connected to MongoDB Atlas for Ticket Logs");
    })
    .catch(err => console.error("Failed to connect to MongoDB Atlas:", err));

module.exports = {
    logTicketCreate: async function(userId, channelId, ticketId) {
        const collection = db.collection('ticket_logs'); // Replace with your collection name
        const log = {
            userId,
            channelId,
            ticketId,
            actionType: 'ticket_create',
            actionTimestamp: new Date(),
        };
        await collection.insertOne(log);
    },
    logTicketClose: async function(userId, channelId, ticketId) {
        const collection = db.collection('ticket_logs'); // Replace with your collection name
        const log = {
            userId,
            channelId,
            ticketId,
            actionType: 'ticket_close',
            actionTimestamp: new Date(),
        };
        await collection.insertOne(log);
    },
    getOpenTickets: async function(userId) {
        const collection = db.collection('ticket_logs'); // Replace with your collection name
        const result = await collection.find({
            userId,
            actionType: 'ticket_create'
        }).toArray();

        return result; // Return all open ticket records for the user
    },
    // ... other methods for handling other ticket-related actions
};