// File: Moderation_Logs.js
const { qldbClient } = require('./aws-config');
module.exports = {
    logMute: async function(memberId, muteEndTime, reason) {
        const params = {
            // Adjusted for your database and table names
            Statement: `
                INSERT INTO Discord-Bot-DB.Moderation_Logs 
                (memberId, actionType, actionTimestamp, duration, reason) 
                VALUES (?, 'mute', ?, ?, ?)
            `,
            Parameters: [
                { IonText: memberId },
                { IonTimestamp: new Date().toISOString() },
                { IonInt: (muteEndTime - Date.now()) / 1000 },  // Store duration in seconds
                { IonText: reason }
            ]
        };
        await qldb.executeStatement(params);
    },

    getRemainingMuteTime: async function(memberId) {
        const params = {
            // Adjusted for your database and table names
            Statement: `
                SELECT * FROM Discord-Bot-DB.Moderation_Logs 
                WHERE memberId = ? AND actionType = 'mute' 
                ORDER BY actionTimestamp DESC LIMIT 1
            `,
            Parameters: [{ IonText: memberId }]
        };
        const result = await qldb.executeStatement(params);
        if (result.Records.length > 0) {
            const record = result.Records[0];
            const muteEndTime = new Date(record.actionTimestamp.IonTimestamp).getTime() + (record.duration.IonInt * 1000);
            return muteEndTime - Date.now();
        }
        return null;  // No mute record found
    }
};
