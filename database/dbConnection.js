const { MongoClient } = require("mongodb");
require('dotenv').config();

const uri = process.env.MONGO_URI;
const mongoClient = new MongoClient(uri);

let db;

const connectToMongo = async () => {
    try {
        await mongoClient.connect();
        db = mongoClient.db('Discord-Bot-DB');  // Replace with your database name
        console.log("Connected to MongoDB Atlas");
        return db;
    } catch (err) {
        console.error("Failed to connect to MongoDB Atlas:", err);
    }
};

module.exports = { connectToMongo };