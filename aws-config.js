// aws-config.js
const { QLDBClient } = require('@aws-sdk/client-qldb');

const qldbClient = new QLDBClient({
    region: "eu-west-1",
    credentials: {
        accessKeyId: 'AKIAX52ENGIVZGSO3JFN',
        secretAccessKey: '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',
        kmsKeyId: "972eb090-5fb2-4293-8f03-929441db4ee2"
    }
});

module.exports = { qldbClient };
