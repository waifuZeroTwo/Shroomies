const cleanupTask = async () => {
    const currentTime = Date.now();
    const collection = db.collection('moderation_logs');

    // Remove expired mutes
    await collection.deleteMany({
        actionType: 'mute',
        actionTimestamp: { $lt: new Date(currentTime) }
    });

    // Remove expired bans
    await collection.deleteMany({
        actionType: 'ban',
        actionTimestamp: { $lt: new Date(currentTime) }
    });
}

// Run the cleanup task every 10 minutes
setInterval(cleanupTask, 10 * 60 * 1000);
