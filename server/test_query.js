import { query, closePool } from './src/db/connection.js';

async function main() {
    try {
        const email = 'admin@school.com '; // wait, what if my email has a trailing space? let me just test email and role
        const emailExact = 'admin@school.com';
        const roleExact = 'admin';

        console.log('Testing Exact Match:');
        let res1 = await query('SELECT * FROM users WHERE email = $1 AND role = $2', [emailExact, roleExact]);
        console.log('Exact Match Rows:', res1.rows.length);

        console.log('Testing Case Sensitivity Email:');
        let res2 = await query('SELECT * FROM users WHERE email = $1 AND role = $2', ['Admin@school.com', roleExact]);
        console.log('Upper Email Match Rows:', res2.rows.length);

        console.log('Testing Trailing Space Email:');
        let res3 = await query('SELECT * FROM users WHERE email = $1 AND role = $2', [emailExact + ' ', roleExact]);
        console.log('Space Email Match Rows:', res3.rows.length);

        // testing how many times $1 and $2 are expected
    } catch (e) {
        console.error('DB Error:', e);
    } finally {
        await closePool();
    }
}

main();
