const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

async function makeAdmin() {
    const email = process.argv[2] || 'admin@test.com';

    try {
        const result = await pool.query(
            'UPDATE "User" SET "isAdmin" = true WHERE email = $1 RETURNING id, name, email, "isAdmin"',
            [email]
        );

        if (result.rows.length > 0) {
            console.log('✅ User is now an admin:');
            console.log(result.rows[0]);
        } else {
            console.log('❌ User not found with email:', email);
        }
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

makeAdmin();
