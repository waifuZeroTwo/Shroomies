const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI; // Replace with your MongoDB Atlas URI
const mongoClient = new MongoClient(uri, { useUnifiedTopology: true });

const connectToMongo = async () => {
    try {
        await mongoClient.connect();
        console.log("Connected to MongoDB Atlas");
    } catch (err) {
        console.error("Failed to connect to MongoDB Atlas:", err);
    }
};

connectToMongo();

module.exports = { mongoClient };