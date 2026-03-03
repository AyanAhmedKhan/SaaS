import { query } from './db/connection.js';

async function resetDB() {
    try {
        await query('DROP SCHEMA public CASCADE;');
        await query('CREATE SCHEMA public;');
        console.log('Database schema reset successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Failed to reset DB schema:', err);
        process.exit(1);
    }
}

resetDB();
