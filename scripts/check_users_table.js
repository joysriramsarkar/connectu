require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';");
    console.log("Columns in users table:", res.rows.map(r => r.column_name));
    
    // Ensure password_hash column exists
    const hasPasswordHash = res.rows.some(r => r.column_name === 'password_hash');
    if (!hasPasswordHash) {
      console.log("Adding password_hash column...");
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;");
      console.log("Added password_hash column successfully.");
    }
  } catch (err) {
    console.error("DB error:", err);
  } finally {
    await pool.end();
  }
}
main();
