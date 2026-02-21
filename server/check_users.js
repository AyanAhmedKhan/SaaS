import { query, closePool } from './src/db/connection.js';

async function main() {
    const res = await query('SELECT id, email, role, password_hash FROM users');
    console.log(res.rows);
    await closePool();
}
main();
