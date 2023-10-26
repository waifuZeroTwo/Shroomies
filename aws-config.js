const { PooledQldbDriver } = require("amazon-qldb-driver-nodejs");

// Replace "YourQLDBLedgerName" with the name of your ledger.
const qldbDriver = new PooledQldbDriver("Discord-Bot-DB");

module.exports = { qldbDriver };