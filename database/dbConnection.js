// database/dbConnection.js

const { MongoClient } = require("mongodb");
require('dotenv').config();

const uri = process.env.MONGO_URI;
const mongoClient = new MongoClient(uri);

const connectToMongo = async () => {
    try {
        await mongoClient.connect();
        console.log("Connected to MongoDB Atlas");
    } catch (err) {
        console.error("Failed to connect to MongoDB Atlas:", err);
    }
};

connectToMongo()
    .then(() => {
        console.log('Successfully connected to MongoDB Atlas.');
    })
    .catch((err) => {
        console.error('Failed to connect to MongoDB Atlas:', err);
    });

module.exports = { mongoClient };
