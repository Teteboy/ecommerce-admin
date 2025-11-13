"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClient = exports.query = exports.testConnection = void 0;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'hongfa_admin',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
// Test database connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});
pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});
// Test connection on startup
const testConnection = async () => {
    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Database connection test successful');
        return true;
    }
    catch (error) {
        console.error('❌ Database connection test failed:', error);
        return false;
    }
};
exports.testConnection = testConnection;
// Query helper function
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log(`Executed query: ${text} (${duration}ms)`);
        return res;
    }
    catch (err) {
        console.error('Query error:', err);
        throw err;
    }
};
exports.query = query;
// Transaction helper
const getClient = async () => {
    const client = await pool.connect();
    const originalQuery = client.query;
    const originalRelease = client.release;
    // Set a timeout of 5 seconds, after which we will log this client's last query
    const timeout = setTimeout(() => {
        console.error('A client has been checked out for more than 5 seconds!');
    }, 5000);
    client.release = () => {
        clearTimeout(timeout);
        // Set the methods back to their old un-monkey-patched version
        client.query = originalQuery;
        client.release = originalRelease;
        return originalRelease.apply(client);
    };
    return client;
};
exports.getClient = getClient;
exports.default = pool;
//# sourceMappingURL=database.js.map