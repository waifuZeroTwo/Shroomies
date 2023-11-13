// Assuming you're using mongoose
const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
    userId: String,
});

const User = mongoose.model('User', userSchema);

// Ticket Schema
const ticketSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    channelId: String,
    status: String,
    createdAt: Date,
    updatedAt: Date,
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = { User, Ticket };
