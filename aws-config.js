const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME
};

const pool = new sql.ConnectionPool(config);
const rdsClient = pool.connect();

module.exports = { rdsClient };